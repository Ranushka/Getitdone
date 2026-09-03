import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatAED } from '@/lib/utils'

// Turns a <input type="date"> value (local, no time) into the UTC bound for
// a range filter — `to` is pushed to the end of that day so it's inclusive.
function toRangeBound(dateStr: string, end: boolean): string | undefined {
  if (!dateStr) return undefined
  const d = new Date(`${dateStr}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return d.toISOString()
}

export function ReportsPage() {
  const { t } = useTranslation()
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const exportCsv = trpc.jobs.exportCsv.useMutation({
    onSuccess: (result) => window.open(result.csvUrl, '_blank'),
    onError: (err) => toast.error(err.message),
  })

  const filteredJobs = useMemo(() => {
    if (!jobs) return []
    const from = fromDate ? new Date(toRangeBound(fromDate, false)!) : null
    const to = toDate ? new Date(toRangeBound(toDate, true)!) : null
    return jobs.filter((job) => {
      const createdAt = new Date(job.createdAt)
      if (from && createdAt < from) return false
      if (to && createdAt > to) return false
      return true
    })
  }, [jobs, fromDate, toDate])

  const completedJobs = filteredJobs.filter((j) => j.status === 'completed')
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.price ? parseFloat(j.price) : 0), 0)

  function handleExport() {
    exportCsv.mutate({
      from: toRangeBound(fromDate, false),
      to: toRangeBound(toDate, true),
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-bold">{t('reports.heading')}</h1>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fromDate">{t('reports.fromLabel')}</Label>
              <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="toDate">{t('reports.toLabel')}</Label>
              <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleExport} disabled={exportCsv.isPending}>
            <Download /> {t('reports.exportCsv')}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

      {!isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-xs text-muted-foreground">{t('reports.totalJobs')}</span>
              <span className="text-2xl font-bold">{filteredJobs.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-xs text-muted-foreground">{t('reports.completedJobs')}</span>
              <span className="text-2xl font-bold">{completedJobs.length}</span>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-xs text-muted-foreground">{t('reports.totalRevenue')}</span>
              <span className="text-2xl font-bold">{formatAED(totalRevenue)}</span>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
