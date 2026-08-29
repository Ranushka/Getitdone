import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TechChecklistClient from "./TechChecklistClient";

export default async function TechJobPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const job = await prisma.job.findUnique({
    where: { shareToken: token },
    include: { items: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { createdAt: "asc" } } } }, signOffs: true },
  });
  if (!job) notFound();

  return <TechChecklistClient job={job} token={token} />;
}
