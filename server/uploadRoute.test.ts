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

describe("Upload Route - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (sdk.authenticateRequest as any).mockRejectedValue(new Error("No session"));
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video")
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
      .post("/api/upload/video")
      .expect(403);

    expect(res.body.error).toContain("admin");
  });

  it("returns 400 when no file is provided", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video")
      .expect(400);

    expect(res.body.error).toBe("No file provided");
  });

  it("uploads video successfully for admin users", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video")
      .attach("file", Buffer.from("fake-video-data"), {
        filename: "test video #1.mp4",
        contentType: "video/mp4",
      })
      .expect(200);

    expect(res.body.url).toBeDefined();
    expect(res.body.fileKey).toBeDefined();
    expect(storagePut).toHaveBeenCalledTimes(1);

    // Verify filename was sanitized
    const callArgs = (storagePut as any).mock.calls[0];
    expect(callArgs[0]).toMatch(/^videos\/[a-zA-Z0-9_-]+-test_video__1\.mp4$/);
  });

  it("uploads thumbnail successfully for admin users", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
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

  it("sanitizes special characters in filenames", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video")
      .attach("file", Buffer.from("fake-video-data"), {
        filename: "my video #2 (final).mp4",
        contentType: "video/mp4",
      })
      .expect(200);

    // Verify the fileKey doesn't contain special characters
    expect(res.body.fileKey).not.toMatch(/[#() ]/);
    expect(res.body.fileKey).toMatch(/\.mp4$/);
  });

  it("handles storage upload failure gracefully", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "admin",
      name: "Admin User",
    });
    (storagePut as any).mockRejectedValueOnce(new Error("S3 upload failed"));
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/video")
      .attach("file", Buffer.from("fake-video-data"), {
        filename: "test.mp4",
        contentType: "video/mp4",
      })
      .expect(500);

    expect(res.body.error).toBe("S3 upload failed");
  });
});

describe("Upload Route - Thumbnail endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated thumbnail upload", async () => {
    (sdk.authenticateRequest as any).mockRejectedValue(new Error("No session"));
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/thumbnail")
      .expect(401);

    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin thumbnail upload", async () => {
    (sdk.authenticateRequest as any).mockResolvedValue({
      id: 1,
      role: "user",
      name: "Test User",
    });
    const app = createApp();

    const res = await request(app)
      .post("/api/upload/thumbnail")
      .expect(403);

    expect(res.body.error).toContain("admin");
  });
});
