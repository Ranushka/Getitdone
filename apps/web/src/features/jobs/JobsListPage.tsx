import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressBar } from '@/components/shared/ProgressBar'

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In progress',
  tech_signed_off: 'Tech signed off',
  completed: 'Completed',
}

export function JobsListPage() {
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery()
  const [search, setSearch] = useState('')

  const filtered = (jobs ?? []).filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Jobs</h1>
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/jobs/new">
            <Plus /> New job
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search jobs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet.</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {filtered.map((job) => (
          <Link key={job.id} to="/jobs/$jobId" params={{ jobId: String(job.id) }}>
            <Card className="transition hover:border-input">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{job.title}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                </div>
                <ProgressBar done={job.doneCount} total={job.itemCount} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Mobile floating action button — desktop uses the inline "New job" button above. */}
      <Button asChild size="icon" className="fixed bottom-6 right-6 rounded-full shadow-lg sm:hidden">
        <Link to="/jobs/new">
          <Plus />
        </Link>
      </Button>
    </div>
  )
}
