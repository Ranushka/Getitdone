import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, managerId: session.user.id },
    include: { items: { orderBy: { order: "asc" } }, signOffs: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // add an item to an existing job (manager only)
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, managerId: session.user.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const count = await prisma.checklistItem.count({ where: { jobId: id } });
  const item = await prisma.checklistItem.create({
    data: { jobId: id, title: title.trim(), order: count },
  });
  return NextResponse.json(item);
}
