import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ShareLinkBox } from '@/components/shared/ShareLinkBox'
import { TranslatableText } from '@/components/shared/TranslatableText'
import { TranslatableItem } from '@/components/shared/TranslatableItem'
import { formatDateTime } from '@/lib/utils'

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url)
}

export function JobDetailPage({ jobId }: { jobId: number }) {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const { data: job, isLoading } = trpc.jobs.get.useQuery({ id: jobId })
  const [newItemTitle, setNewItemTitle] = useState('')
  const [managerName, setManagerName] = useState('')

  const STATUS_LABEL: Record<string, string> = {
    in_progress: t('status.in_progress'),
    tech_signed_off: t('status.tech_signed_off'),
    completed: t('status.completed'),
  }

  const addItem = trpc.jobs.addItem.useMutation({
    onSuccess: async () => {
      setNewItemTitle('')
      await utils.jobs.get.invalidate({ id: jobId })
    },
    onError: (err) => toast.error(err.message),
  })

  const signoffManager = trpc.jobs.signoffManager.useMutation({
    onSuccess: async () => {
      await utils.jobs.get.invalidate({ id: jobId })
      toast.success(t('jobs.jobCompleted'))
    },
    onError: (err) => toast.error(err.message),
  })

  const generatePdf = trpc.jobs.generatePdf.useMutation({
    onSuccess: (result) => window.open(result.pdfUrl, '_blank'),
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
  if (!job) return <p className="p-4 text-sm text-muted-foreground">{t('common.jobNotFound')}</p>

  const techSignOff = job.signOffs.find((s) => s.role === 'technician')
  const managerSignOff = job.signOffs.find((s) => s.role === 'manager')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          <TranslatableText text={job.title} />
        </h1>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </div>
      {job.notes ? (
        <p className="text-sm text-muted-foreground">
          <TranslatableText text={job.notes} />
        </p>
      ) : null}

      <ShareLinkBox shareToken={job.shareToken} />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{t('common.checklist')}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {job.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <TranslatableItem
                    title={item.title}
                    comment={item.comment}
                    titleClassName="font-medium"
                    commentClassName="mt-1 text-sm text-muted-foreground"
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.status}</span>
              </div>
              {item.attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.attachments.map((a) =>
                    isVideoUrl(a.url) ? (
                      <video key={a.id} src={a.url} controls className="h-24 w-24 rounded-md object-cover" />
                    ) : (
                      <img
                        key={a.id}
                        src={a.url}
                        alt=""
                        className="h-24 w-24 rounded-md object-cover"
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          ))}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!newItemTitle.trim()) return
              addItem.mutate({ jobId, title: newItemTitle })
            }}
          >
            <Input
              placeholder={t('jobs.addChecklistItemPlaceholder')}
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={addItem.isPending}>
              <Plus />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{t('common.signOffSection')}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span>{t('common.technician')}</span>
            <span className="text-muted-foreground">
              {techSignOff ? `${techSignOff.name} — ${formatDateTime(techSignOff.signedAt)}` : t('common.pending')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t('common.manager')}</span>
            <span className="text-muted-foreground">
              {managerSignOff
                ? `${managerSignOff.name} — ${formatDateTime(managerSignOff.signedAt)}`
                : t('common.pending')}
            </span>
          </div>

          {!managerSignOff ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!managerName.trim()) return
                signoffManager.mutate({ id: jobId, name: managerName })
              }}
            >
              <Input
                placeholder={t('common.yourName')}
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                disabled={!techSignOff}
              />
              <Button type="submit" disabled={!techSignOff || signoffManager.isPending}>
                {t('common.signOff')}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => generatePdf.mutate({ id: jobId })} disabled={generatePdf.isPending}>
        <FileText /> {generatePdf.isPending ? t('jobs.generatingPdf') : t('jobs.generatePdf')}
      </Button>
    </div>
  )
}
