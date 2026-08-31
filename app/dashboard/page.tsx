import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JobsListClient from "./JobsListClient";

export default async function DashboardPage() {
  const session = await auth();
  const jobs = await prisma.job.findMany({
    where: { managerId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <JobsListClient
      jobs={jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        doneCount: job.items.filter((i) => i.status === "DONE").length,
        totalCount: job.items.length,
      }))}
    />
  );
}
