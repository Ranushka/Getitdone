import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type JobSummary = {
  id: number
  title: string
  status: string
  scheduledAt: string | Date | null
}

// One dot color per job status — purely a visual accent, this app ships a
// single light theme (see index.css) so no dark-mode variant is needed.
const STATUS_DOT: Record<string, string> = {
  in_progress: 'bg-blue-500',
  tech_signed_off: 'bg-amber-500',
  completed: 'bg-green-500',
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Builds a 6x7 grid of dates covering the visible month, padded with the
// tail of the previous month and the head of the next so every week row is
// full — the standard month-grid layout.
function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export function CalendarPage() {
  const { t, i18n } = useTranslation()
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery()
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  const today = new Date()
  const grid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor])

  const jobsByDay = useMemo(() => {
    const map = new Map<string, JobSummary[]>()
    for (const job of jobs ?? []) {
      if (!job.scheduledAt) continue
      const d = new Date(job.scheduledAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const existing = map.get(key) ?? []
      existing.push(job)
      map.set(key, existing)
    }
    return map
  }, [jobs])

  const unscheduled = (jobs ?? []).filter((job) => !job.scheduledAt)

  const monthFormatter = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' })
  const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const weekdayLabels = useMemo(() => {
    // Sun..Sat, locale-formatted — 2024-01-07 is a Sunday, used only as a
    // stable anchor to read each weekday's short name from Intl.
    const sunday = new Date(2024, 0, 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return weekdayFormatter.format(d)
    })
  }, [weekdayFormatter])

  const STATUS_LABEL: Record<string, string> = {
    in_progress: t('status.in_progress'),
    tech_signed_off: t('status.tech_signed_off'),
    completed: t('status.completed'),
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('calendar.title')}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthAnchor(startOfMonth(new Date()))}
        >
          {t('calendar.today')}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.previousMonth')}
          onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-semibold capitalize">{monthFormatter.format(monthAnchor)}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.nextMonth')}
          onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-card">
          {weekdayLabels.map((label) => (
            <div key={label} className="p-1.5 text-center text-[11px] font-medium text-muted-foreground sm:p-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const inMonth = day.getMonth() === monthAnchor.getMonth()
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            const dayJobs = jobsByDay.get(key) ?? []
            const isToday = isSameDay(day, today)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex min-h-20 flex-col gap-1 border-b border-e border-border p-1 sm:min-h-24 sm:p-1.5',
                  !inMonth && 'bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center self-end rounded-full text-[11px]',
                    !inMonth && 'text-muted-foreground',
                    isToday && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayJobs.slice(0, 2).map((job) => (
                    <Link
                      key={job.id}
                      to="/jobs/$jobId"
                      params={{ jobId: String(job.id) }}
                      title={`${job.title} — ${STATUS_LABEL[job.status] ?? job.status}`}
                      className="flex items-center gap-1 truncate rounded bg-secondary px-1 py-0.5 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/70 sm:text-xs"
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[job.status] ?? 'bg-muted-foreground')} />
                      <span className="truncate">{job.title}</span>
                    </Link>
                  ))}
                  {dayJobs.length > 2 ? (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      {t('calendar.moreJobs', { count: dayJobs.length - 2 })}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {unscheduled.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('calendar.unscheduled')}</h2>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((job) => (
              <Link
                key={job.id}
                to="/jobs/$jobId"
                params={{ jobId: String(job.id) }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-secondary"
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[job.status] ?? 'bg-muted-foreground')} />
                {job.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
