import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: technician sign-off (typed name + confirm). Manager sign-off happens
// through the authenticated /api/jobs/[id]/signoff route instead.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const job = await prisma.job.findUnique({
    where: { shareToken: token },
    include: { items: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const incomplete = job.items.some((i) => i.status !== "DONE");
  if (incomplete) {
    return NextResponse.json(
      { error: "All checklist items must be marked done first" },
      { status: 400 }
    );
  }

  await prisma.signOff.upsert({
    where: { jobId_role: { jobId: job.id, role: "TECHNICIAN" } },
    create: { jobId: job.id, role: "TECHNICIAN", name: name.trim() },
    update: { name: name.trim(), signedAt: new Date() },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "TECH_SIGNED_OFF" },
  });

  return NextResponse.json({ ok: true });
}
