import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: technician attaches a photo/video to an item. The file itself is
// uploaded separately via /api/upload — this just records the resulting URL
// against the item. Called once per capture, so an item can end up with any
// number of attachments.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const { token, itemId } = await params;
  const job = await prisma.job.findUnique({ where: { shareToken: token } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, jobId: job.id },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { url } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "url required" }, { status: 400 });

  const attachment = await prisma.attachment.create({
    data: { itemId, url: url.trim() },
  });

  return NextResponse.json(attachment);
}
