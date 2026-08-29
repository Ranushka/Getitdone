import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, managerId: session!.user!.id },
    include: { items: { orderBy: { order: "asc" } }, signOffs: true },
  });
  if (!job) notFound();

  return (
    <JobDetailClient
      job={{
        ...job,
        signOffs: job.signOffs.map((s) => ({
          ...s,
          signedAt: s.signedAt.toISOString(),
        })),
      }}
    />
  );
}
