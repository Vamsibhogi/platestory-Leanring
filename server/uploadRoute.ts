import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
});

const router = Router();

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

// POST /api/upload/video - Upload video file to S3
router.post("/video", requireAdmin, upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = req.file;
    const originalName = file.originalname || "video.mp4";
    // Sanitize filename: remove special chars that break URLs
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `videos/${nanoid()}-${safeName}`;

    console.log(`[Upload] Starting video upload: ${safeName} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    console.log(`[Upload] Video uploaded successfully: ${fileKey}`);

    return res.json({ url, fileKey });
  } catch (err: any) {
    console.error("[Upload] Video upload failed:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// POST /api/upload/thumbnail - Upload thumbnail image to S3
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
