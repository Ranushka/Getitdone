import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: technician updates one checklist item (comment, mark done). Photo
// and video attachments are handled by the nested attachments route since an
// item can carry more than one.
export async function PATCH(
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

  const { comment, status } = await req.json();

  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(comment !== undefined ? { comment } : {}),
      ...(status !== undefined
        ? { status, completedAt: status === "DONE" ? new Date() : null }
        : {}),
    },
    include: { attachments: true },
  });

  return NextResponse.json(updated);
}
