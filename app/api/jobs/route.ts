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
    items: (string | { title: string; attachmentUrls?: string[] })[];
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  // Accepts either plain strings (legacy) or { title, attachmentUrls } —
  // the New Job form lets a manager attach reference photos/videos per
  // item before the job (and its item ids) exist.
  const normalizedItems = (items || [])
    .map((i) => (typeof i === "string" ? { title: i, attachmentUrls: [] as string[] } : i))
    .map((i) => ({ title: i.title.trim(), attachmentUrls: i.attachmentUrls || [] }))
    .filter((i) => i.title);

  const job = await prisma.job.create({
    data: {
      title: title.trim(),
      notes: notes?.trim() || null,
      managerId: session.user.id,
      items: {
        create: normalizedItems.map((i, idx) => ({
          title: i.title,
          order: idx,
          attachments: {
            create: i.attachmentUrls.map((url) => ({ url })),
          },
        })),
      },
    },
    include: { items: { include: { attachments: true } } },
  });

  return NextResponse.json(job);
}
