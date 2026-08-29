import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Public: photos are keyed by random UUID filenames — not guessable, and the
// technician flow never needs auth. Accepts multipart/form-data with a "file" field.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images or videos are allowed" }, { status: 400 });
  }
  const MAX_BYTES = (isVideo ? 100 : 10) * 1024 * 1024; // 100MB video, 10MB image
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${isVideo ? "100MB" : "10MB"} max)` },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR);
  await mkdir(dir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
