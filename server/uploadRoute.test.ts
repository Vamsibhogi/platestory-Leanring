import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { uploadRouter } from "./uploadRoute";

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "videos/test-key-video.mp4",
    url: "https://cdn.example.com/videos/test-key-video.mp4",
  }),
}));

// Mock the SDK for auth
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";

function createApp() {
  const app = express();
  app.use("/api/upload", uploadRouter);
  return app;
}

describe("Chunked Upload - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (sdk.authenticateRequest as any).mockRejectedValue(new Error("No session"));
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video-chunk")
      .expect(401);

    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not admin", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "user",
      name: "Test User",
    });
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video-chunk")
      .expect(403);

    expect(res.body.error).toContain("admin");
  });
});

describe("Chunked Upload - Video chunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
  });

  it("returns 400 when missing required fields", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video-chunk")
      .attach("chunk", Buffer.from("test-data"), "chunk-0")
      .expect(400);

    expect(res.body.error).toContain("Missing required fields");
  });

  it("accepts first chunk and initializes session", async () => {
    const app = createApp();
    const sessionId = "test-session-123";

    const res = await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "0")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-0-data"), "chunk-0")
      .expect(200);

    expect(res.body.complete).toBe(false);
    expect(res.body.sessionId).toBe(sessionId);
    expect(res.body.received).toBe(1);
  });

  it("accepts multiple chunks and tracks progress", async () => {
    const app = createApp();
    const sessionId = "test-session-456";

    // Upload chunk 0
    await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "0")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-0-data"), "chunk-0")
      .expect(200);

    // Upload chunk 1
    const res2 = await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "1")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-1-data"), "chunk-1")
      .expect(200);

    expect(res2.body.complete).toBe(false);
    expect(res2.body.received).toBe(2);
  });

  it("signals completion when all chunks are received", async () => {
    const app = createApp();
    const sessionId = "test-session-789";

    // Upload all 3 chunks
    await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "0")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-0-data"), "chunk-0")
      .expect(200);

    await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "1")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-1-data"), "chunk-1")
      .expect(200);

    const res3 = await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "2")
      .field("totalChunks", "3")
      .field("fileName", "test-video.mp4")
      .attach("chunk", Buffer.from("chunk-2-data"), "chunk-2")
      .expect(200);

    expect(res3.body.complete).toBe(true);
    expect(res3.body.sessionId).toBe(sessionId);
  });
});

describe("Chunked Upload - Completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
  });

  it("returns 400 when sessionId is missing", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video-complete")
      .send({})
      .expect(400);

    expect(res.body.error).toContain("Missing sessionId");
  });

  it("returns 404 when session does not exist", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video-complete")
      .send({ sessionId: "non-existent-session" })
      .expect(404);

    expect(res.body.error).toContain("Session not found");
  });

  it("assembles chunks and uploads to S3", async () => {
    const app = createApp();
    const sessionId = "test-complete-session";

    // Upload 2 chunks
    await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "0")
      .field("totalChunks", "2")
      .field("fileName", "complete-test.mp4")
      .attach("chunk", Buffer.from("first-chunk"), "chunk-0")
      .expect(200);

    await request(app)
      .post("/api/upload/video-chunk")
      .field("sessionId", sessionId)
      .field("chunkIndex", "1")
      .field("totalChunks", "2")
      .field("fileName", "complete-test.mp4")
      .attach("chunk", Buffer.from("second-chunk"), "chunk-1")
      .expect(200);

    // Complete the upload
    const res = await request(app)
      .post("/api/upload/video-complete")
      .send({ sessionId })
      .expect(200);

    expect(res.body.url).toBeDefined();
    expect(res.body.fileKey).toBeDefined();
    expect(storagePut).toHaveBeenCalledTimes(1);

    // Verify the assembled file contains both chunks
    const callArgs = (storagePut as any).mock.calls[0];
    const assembledBuffer = callArgs[1] as Buffer;
    expect(assembledBuffer.toString()).toBe("first-chunksecond-chunk");
  });
});

describe("Thumbnail Upload - Unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
  });

  it("uploads thumbnail successfully", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/thumbnail")
      .attach("file", Buffer.from("fake-image-data"), {
        filename: "thumb.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(res.body.url).toBeDefined();
    expect(res.body.fileKey).toBeDefined();
    expect(res.body.fileKey).toMatch(/^thumbnails\//);
  });
});
