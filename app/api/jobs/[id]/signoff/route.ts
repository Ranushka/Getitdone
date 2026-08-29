import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, managerId: session.user.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await prisma.signOff.upsert({
    where: { jobId_role: { jobId: id, role: "MANAGER" } },
    create: { jobId: id, role: "MANAGER", name: name.trim() },
    update: { name: name.trim(), signedAt: new Date() },
  });

  await prisma.job.update({ where: { id }, data: { status: "COMPLETED" } });

  return NextResponse.json({ ok: true });
}
