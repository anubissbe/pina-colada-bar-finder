import type { Request, Response } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export async function handlePhotoUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate unique file key
    const fileExtension = req.file.originalname.split(".").pop() || "jpg";
    const fileKey = `reviews/${nanoid()}.${fileExtension}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ url });
  } catch (error) {
    console.error("Photo upload error:", error);
    res.status(500).json({ error: "Failed to upload photo" });
  }
}
