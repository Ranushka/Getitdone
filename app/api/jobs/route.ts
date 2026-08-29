import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { managerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true, signOffs: true },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, notes, items } = body as {
    title: string;
    notes?: string;
    items: string[];
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title: title.trim(),
      notes: notes?.trim() || null,
      managerId: session.user.id,
      items: {
        create: (items || [])
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t, i) => ({ title: t, order: i })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(job);
}
