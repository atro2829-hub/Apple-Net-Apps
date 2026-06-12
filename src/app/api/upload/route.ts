import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_FORMATS = ["png", "jpg", "jpeg", "svg", "webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 256;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds 2MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Check file format
    const originalName = file.name.toLowerCase();
    const ext = originalName.split(".").pop();

    if (!ext || !ALLOWED_FORMATS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file format. Allowed: ${ALLOWED_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueId = uuidv4().slice(0, 8);
    const timestamp = Date.now();
    const filename = `${timestamp}-${uniqueId}.${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filePath = join(uploadsDir, filename);

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SVG files should not be processed with sharp
    if (ext === "svg") {
      await writeFile(filePath, buffer);
    } else {
      // Resize image using sharp
      const resizedBuffer = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFormat(ext as "png" | "jpg" | "jpeg" | "webp")
        .toBuffer();

      await writeFile(filePath, resizedBuffer);
    }

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
