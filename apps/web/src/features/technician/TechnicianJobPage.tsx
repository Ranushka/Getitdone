import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Camera, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { TranslatableText } from '@/components/shared/TranslatableText'

interface TechAttachment {
  id: number
  url: string
}
interface TechItem {
  id: number
  title: string
  comment: string | null
  status: 'pending' | 'done'
  attachments: TechAttachment[]
}
interface TechJob {
  id: number
  title: string
  notes: string | null
  status: string
  shareToken: string
  items: TechItem[]
  signOffs: { role: string; name: string }[]
}

async function fetchJob(token: string): Promise<TechJob> {
  const res = await fetch(`/api/t/${token}`)
  if (!res.ok) throw new Error('Job not found')
  return res.json()
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Upload failed')
  }
  return (await res.json()).url
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url)
}

export function TechnicianJobPage({ token }: { token: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const queryKey = ['technician-job', token]
  const { data: job, isLoading } = useQuery({ queryKey, queryFn: () => fetchJob(token) })
  const [signOffName, setSignOffName] = useState('')
  const [signingOff, setSigningOff] = useState(false)

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey })
  }

  async function updateItem(itemId: number, patch: { comment?: string; status?: 'pending' | 'done' }) {
    const res = await fetch(`/api/t/${token}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      toast.error(t('technician.updateItemFailed'))
      return
    }
    await invalidate()
  }

  async function handleAttach(itemId: number, files: FileList | null) {
    if (!files || files.length === 0) return
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file)
        await fetch(`/api/t/${token}/items/${itemId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
      }
      await invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('technician.uploadFailed'))
    }
  }

  async function handleSignOff(e: React.FormEvent) {
    e.preventDefault()
    if (!signOffName.trim()) return
    setSigningOff(true)
    try {
      const res = await fetch(`/api/t/${token}/signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signOffName }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? t('technician.signOffFailed'))
      }
      await invalidate()
      toast.success(t('technician.signedOffToast'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('technician.signOffFailed'))
    } finally {
      setSigningOff(false)
    }
  }

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
  if (!job) return <p className="p-4 text-sm text-muted-foreground">{t('common.jobNotFound')}</p>

  const doneCount = job.items.filter((i) => i.status === 'done').length
  const allDone = job.items.length > 0 && doneCount === job.items.length
  const techSignedOff = job.signOffs.some((s) => s.role === 'technician')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <div>
        <h1 className="text-xl font-bold">
          <TranslatableText text={job.title} />
        </h1>
        {job.notes ? (
          <p className="text-sm text-muted-foreground">
            <TranslatableText text={job.notes} />
          </p>
        ) : null}
      </div>

      <ProgressBar done={doneCount} total={job.items.length} />

      <div className="flex flex-col gap-3">
        {job.items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between">
              <span className="font-medium">
                <TranslatableText text={item.title} />
              </span>
              <Button
                type="button"
                variant={item.status === 'done' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateItem(item.id, { status: item.status === 'done' ? 'pending' : 'done' })}
              >
                <Check /> {item.status === 'done' ? t('technician.done') : t('technician.markDone')}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Textarea
                placeholder={t('technician.commentPlaceholder')}
                defaultValue={item.comment ?? ''}
                onBlur={(e) => updateItem(item.id, { comment: e.target.value })}
              />
              {item.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.attachments.map((a) =>
                    isVideoUrl(a.url) ? (
                      <video key={a.id} src={a.url} controls className="h-20 w-20 rounded-md object-cover" />
                    ) : (
                      <img key={a.id} src={a.url} alt="" className="h-20 w-20 rounded-md object-cover" />
                    ),
                  )}
                </div>
              ) : null}
              <label className="inline-flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Camera className="size-3.5" />
                {t('common.attachPhotoVideo')}
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAttach(item.id, e.target.files)}
                />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{t('common.signOffSection')}</h2>
        </CardHeader>
        <CardContent>
          {techSignedOff ? (
            <p className="text-sm text-muted-foreground">{t('technician.signedOffThanks')}</p>
          ) : (
            <form className="flex gap-2" onSubmit={handleSignOff}>
              <Input
                placeholder={t('common.yourName')}
                value={signOffName}
                onChange={(e) => setSignOffName(e.target.value)}
                disabled={!allDone}
              />
              <Button type="submit" disabled={!allDone || signingOff}>
                {t('common.signOff')}
              </Button>
            </form>
          )}
          {!allDone && !techSignedOff ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('technician.markAllDoneNotice')}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
