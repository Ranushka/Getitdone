"use client";

import { useState } from "react";
import Link from "next/link";

type JobSummary = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "TECH_SIGNED_OFF" | "COMPLETED";
  doneCount: number;
  totalCount: number;
};

const STATUS_LABEL: Record<JobSummary["status"], string> = {
  IN_PROGRESS: "In progress",
  TECH_SIGNED_OFF: "Awaiting your sign-off",
  COMPLETED: "Completed",
};

export default function JobsListClient({ jobs }: { jobs: JobSummary[] }) {
  const [query, setQuery] = useState("");
  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    // Mobile (below md): floating search bar + FAB pinned to the viewport, iOS-app style.
    // Desktop (md+): everything sits inline in the normal document flow, no fixed/floating
    // chrome — a bottom-pinned bar reads as a mobile pattern and looks out of place on desktop.
    <div className="flex flex-col gap-4 pb-24 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#23301f]">Jobs</h1>
        <Link
          href="/dashboard/jobs/new"
          className="hidden md:flex rounded-full bg-black text-white pl-4 pr-5 py-2 text-sm font-medium items-center gap-1.5"
        >
          <span className="text-base leading-none">+</span> New job
        </Link>
      </div>

      {jobs.length > 0 && (
        <div className="hidden md:flex items-center gap-2 rounded-full bg-white/85 border border-black/5 shadow-sm px-4 py-2.5">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5b6b53" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs"
            className="flex-1 bg-transparent outline-none text-sm text-[#23301f] placeholder:text-[#8a9682]"
          />
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-[#5b6b53] text-sm">No jobs yet. Create your first one.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {filtered.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white/85 border border-black/5 shadow-sm px-4 py-3.5 active:scale-[0.99] transition-transform"
                >
                  <span className="shrink-0 h-10 w-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-semibold">
                    {job.title.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#23301f] truncate">
                        {job.title}
                      </span>
                      <span className="shrink-0 text-xs text-[#5b6b53]">
                        {STATUS_LABEL[job.status]}
                      </span>
                    </span>
                    <span className="block text-sm text-[#5b6b53] mt-0.5">
                      {job.doneCount}/{job.totalCount} items done
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="text-[#5b6b53] text-sm">No jobs match &ldquo;{query}&rdquo;.</p>
          )}

          {/* Mobile-only floating search bar */}
          <div className="md:hidden fixed left-0 right-0 bottom-4 mx-auto max-w-2xl px-4">
            <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-black/10 shadow-sm px-4 py-2.5">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5b6b53" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jobs"
                className="flex-1 bg-transparent outline-none text-sm text-[#23301f] placeholder:text-[#8a9682]"
              />
            </div>
          </div>
        </>
      )}

      {/* Mobile-only floating action button */}
      <Link
        href="/dashboard/jobs/new"
        className="md:hidden fixed bottom-20 right-4 rounded-full bg-black text-white pl-4 pr-5 py-3 text-sm font-medium shadow-lg flex items-center gap-1.5"
      >
        <span className="text-base leading-none">+</span> New job
      </Link>
    </div>
  );
}
