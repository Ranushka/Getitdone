import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: technician view of a job, no auth — the share token IS the access control.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const job = await prisma.job.findUnique({
    where: { shareToken: token },
    include: { items: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { createdAt: "asc" } } } }, signOffs: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
