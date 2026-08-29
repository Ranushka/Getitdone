import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  TECH_SIGNED_OFF: "Awaiting your sign-off",
  COMPLETED: "Completed",
};

export default async function DashboardPage() {
  const session = await auth();
  const jobs = await prisma.job.findMany({
    where: { managerId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <Link
          href="/dashboard/jobs/new"
          className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium"
        >
          + New job
        </Link>
      </div>

      {jobs.length === 0 && (
        <p className="text-gray-500 text-sm">No jobs yet. Create your first one.</p>
      )}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => {
          const done = job.items.filter((i) => i.status === "DONE").length;
          return (
            <li key={job.id}>
              <Link
                href={`/dashboard/jobs/${job.id}`}
                className="block rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{job.title}</span>
                  <span className="text-xs text-gray-500">
                    {STATUS_LABEL[job.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {done}/{job.items.length} items done
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
