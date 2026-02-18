// Video upload route v2.0 - Production ready with chunked upload
import express, { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import os from "os";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per chunk (well below proxy limit)
});

const router = Router();

// JSON parser for video-complete endpoint (applied per-route to avoid conflict with multer)
const jsonParser = express.json();

// In-memory store for tracking upload sessions
const uploadSessions = new Map<string, {
  fileName: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  tempDir: string;
  createdAt: number;
  url?: string;
  fileKey?: string;
}>();

// Clean up stale sessions older than 1 hour
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(uploadSessions.entries());
  for (const [sessionId, session] of entries) {
    if (now - session.createdAt > 60 * 60 * 1000) {
      fs.rm(session.tempDir, { recursive: true, force: true }).catch(console.error);
      uploadSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Middleware to authenticate the request
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// POST /api/upload/video-chunk - Upload a single chunk
router.post("/video-chunk", requireAdmin, upload.single("chunk"), async (req: any, res) => {
  try {
    const { sessionId, chunkIndex, totalChunks, fileName } = req.body;

    if (!sessionId || chunkIndex === undefined || !totalChunks || !fileName) {
      return res.status(400).json({ error: "Missing required fields: sessionId, chunkIndex, totalChunks, fileName" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No chunk data provided" });
    }

    const chunkIdx = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    // Initialize session if it doesn't exist
    if (!uploadSessions.has(sessionId)) {
      const tempDir = path.join(os.tmpdir(), `upload-${sessionId}`);
      await fs.mkdir(tempDir, { recursive: true });
      uploadSessions.set(sessionId, {
        fileName,
        totalChunks: totalChunksNum,
        receivedChunks: new Set(),
        tempDir,
        createdAt: Date.now(),
      });
    }

    const session = uploadSessions.get(sessionId)!;

    // Save chunk to temp file
    const chunkPath = path.join(session.tempDir, `chunk-${chunkIdx}`);
    await fs.writeFile(chunkPath, req.file.buffer);
    session.receivedChunks.add(chunkIdx);

    console.log(`[Upload] Chunk ${chunkIdx + 1}/${totalChunksNum} received for session ${sessionId}`);

    // Check if all chunks are received
    if (session.receivedChunks.size === session.totalChunks) {
      console.log(`[Upload] All chunks received for session ${sessionId}, assembling file...`);
      
      // Assemble chunks immediately
      const chunks: Buffer[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(session.tempDir, `chunk-${i}`);
        const chunkData = await fs.readFile(chunkPath);
        chunks.push(chunkData);
      }

      const completeFile = Buffer.concat(chunks);
      const fileSizeMB = (completeFile.length / 1024 / 1024).toFixed(1);

      console.log(`[Upload] Assembled file: ${session.fileName} (${fileSizeMB}MB), uploading to S3...`);

      // Sanitize filename
      const safeName = session.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `videos/${nanoid()}-${safeName}`;

      // Determine content type
      const ext = safeName.split(".").pop()?.toLowerCase();
      const contentType = ext === "mp4" ? "video/mp4" : 
                         ext === "webm" ? "video/webm" :
                         ext === "mov" ? "video/quicktime" : "video/mp4";

      // Upload to S3
      const { url } = await storagePut(fileKey, completeFile, contentType);

      console.log(`[Upload] Video uploaded successfully: ${fileKey}`);

      // Store URL in session for video-complete endpoint (in case frontend calls it)
      session.url = url;
      session.fileKey = fileKey;

      // Clean up temp files
      await fs.rm(session.tempDir, { recursive: true, force: true }).catch(console.error);

      return res.json({ complete: true, url, fileKey });
    }

    return res.json({ complete: false, sessionId, received: session.receivedChunks.size });
  } catch (err: any) {
    console.error("[Upload] Chunk upload failed:", err);
    return res.status(500).json({ error: err.message || "Chunk upload failed" });
  }
});

// POST /api/upload/video-complete - Assemble chunks and upload to S3
router.post("/video-complete", jsonParser, requireAdmin, async (req: any, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

    // If URL already exists (last chunk already assembled), return it
    if (session.url && session.fileKey) {
      console.log(`[Upload] Returning already-uploaded video: ${session.fileKey}`);
      uploadSessions.delete(sessionId); // Clean up session
      return res.json({ url: session.url, fileKey: session.fileKey });
    }

    // Verify all chunks are present
    if (session.receivedChunks.size !== session.totalChunks) {
      return res.status(400).json({ 
        error: `Incomplete upload: ${session.receivedChunks.size}/${session.totalChunks} chunks received` 
      });
    }

    // Assemble chunks in order
    const chunks: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(session.tempDir, `chunk-${i}`);
      const chunkData = await fs.readFile(chunkPath);
      chunks.push(chunkData);
    }

    const completeFile = Buffer.concat(chunks);
    const fileSizeMB = (completeFile.length / 1024 / 1024).toFixed(1);

    console.log(`[Upload] Assembled file: ${session.fileName} (${fileSizeMB}MB), uploading to S3...`);

    // Sanitize filename
    const safeName = session.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `videos/${nanoid()}-${safeName}`;

    // Determine content type
    const ext = safeName.split(".").pop()?.toLowerCase();
    const contentType = ext === "mp4" ? "video/mp4" : 
                       ext === "webm" ? "video/webm" :
                       ext === "mov" ? "video/quicktime" : "video/mp4";

    // Upload to S3
    const { url } = await storagePut(fileKey, completeFile, contentType);

    console.log(`[Upload] Video uploaded successfully: ${fileKey}`);

    // Clean up temp files and session
    await fs.rm(session.tempDir, { recursive: true, force: true }).catch(console.error);
    uploadSessions.delete(sessionId);

    return res.json({ url, fileKey });
  } catch (err: any) {
    console.error("[Upload] Video completion failed:", err);
    return res.status(500).json({ error: err.message || "Upload completion failed" });
  }
});

// POST /api/upload/thumbnail - Upload thumbnail image to S3 (unchanged, small files don't need chunking)
router.post("/thumbnail", requireAdmin, upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = req.file;
    const originalName = file.originalname || "image.jpg";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `thumbnails/${nanoid()}-${safeName}`;

    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    return res.json({ url, fileKey });
  } catch (err: any) {
    console.error("[Upload] Thumbnail upload failed:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export { router as uploadRouter };
