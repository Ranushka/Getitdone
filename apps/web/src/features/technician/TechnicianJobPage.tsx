import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Languages, ImageOff, Eraser, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import {
  CameraCaptureButton,
  type CapturedPhoto,
  type CameraCaptureButtonHandle,
} from '@/components/shared/CameraCaptureButton'
import { SignaturePad, type SignaturePadHandle } from '@/components/shared/SignaturePad'
import { cn } from '@/lib/utils'

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
  needsToolsAndParts: boolean
  items: TechItem[]
  signOffs: { role: string; name: string; signatureUrl: string | null }[]
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
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const queryKey = ['technician-job', token]
  const { data: job, isLoading } = useQuery({ queryKey, queryFn: () => fetchJob(token) })
  const describePhoto = trpc.photos.describe.useMutation()
  const utils = trpc.useUtils()
  const [signOffName, setSignOffName] = useState('')
  const [signingOff, setSigningOff] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const captureButtonRefs = useRef<Record<number, CameraCaptureButtonHandle | null>>({})
  const signaturePadRef = useRef<SignaturePadHandle>(null)
  const [hasSignature, setHasSignature] = useState(false)

  // One translate control for the whole page instead of a button per field —
  // hidden entirely when the UI is already in English (content is assumed
  // to be typed in English by default).
  const targetLang = (i18n.resolvedLanguage ?? i18n.language) as 'en' | 'ar' | 'si' | 'ur' | 'hi'
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [showingOriginal, setShowingOriginal] = useState(true)
  const [translating, setTranslating] = useState(false)

  function displayText(text: string) {
    return !showingOriginal && translations[text] ? translations[text] : text
  }

  async function handleTranslatePage() {
    if (!job) return
    if (Object.keys(translations).length > 0) {
      setShowingOriginal(false)
      return
    }
    setTranslating(true)
    try {
      const texts = [...new Set([job.title, ...(job.notes ? [job.notes] : []), ...job.items.map((i) => i.title)])]
      const results = await Promise.all(texts.map((text) => utils.translate.text.fetch({ text, targetLang })))
      const map: Record<string, string> = {}
      texts.forEach((text, i) => (map[text] = results[i].translated))
      setTranslations(map)
      setShowingOriginal(false)
    } catch {
      toast.error(t('translate.translating'))
    } finally {
      setTranslating(false)
    }
  }

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey })
  }

  function handleToggleDone(item: TechItem) {
    if (item.status === 'done') {
      updateItem(item.id, { status: 'pending' })
      return
    }
    // Marking done requires photo confirmation — if none is attached yet,
    // prompt for one instead of completing the item outright.
    if (item.attachments.length === 0) {
      toast.error(t('technician.photoRequiredToast'))
      captureButtonRefs.current[item.id]?.open()
      return
    }
    updateItem(item.id, { status: 'done' })
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

  async function handleCameraCapture(itemId: number, photo: CapturedPhoto) {
    try {
      const url = await uploadFile(photo.file)
      await fetch(`/api/t/${token}/items/${itemId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      // Best-effort — a failed description shouldn't block the attachment
      // itself, which is already saved above.
      try {
        const { description } = await describePhoto.mutateAsync({ imageDataUrl: photo.dataUrl })
        const existing = job?.items.find((i) => i.id === itemId)?.comment
        const mergedComment = existing ? `${existing}\n${description}` : description
        await fetch(`/api/t/${token}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: mergedComment }),
        })
      } catch {
        // AI description failed (e.g. no OpenRouter key configured) — ignore.
      }

      await invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('technician.uploadFailed'))
    }
  }

  async function handleSignOff(e: React.FormEvent) {
    e.preventDefault()
    if (!signOffName.trim()) return
    if (signaturePadRef.current?.isEmpty()) {
      toast.error(t('technician.signatureRequired'))
      return
    }
    setSigningOff(true)
    try {
      const blob = await signaturePadRef.current?.toBlob()
      let signatureUrl: string | undefined
      if (blob) {
        signatureUrl = await uploadFile(new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }))
      }

      const res = await fetch(`/api/t/${token}/signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signOffName, signatureUrl }),
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
  const techSignOff = job.signOffs.find((s) => s.role === 'technician')
  const techSignedOff = !!techSignOff

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-end gap-2">
        {targetLang !== 'en' ? (
          showingOriginal ? (
            <button
              type="button"
              onClick={handleTranslatePage}
              disabled={translating}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Languages className="size-3.5" />
              {translating ? t('translate.translating') : t('translate.translate')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowingOriginal(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              {t('translate.showOriginal')}
            </button>
          )
        ) : null}
        <LanguageSwitcher />
      </div>

      <div>
        <h1 className="text-xl font-bold">{displayText(job.title)}</h1>
        {job.notes ? <p className="text-sm text-muted-foreground">{displayText(job.notes)}</p> : null}
      </div>

      {job.needsToolsAndParts ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-700">
          <Wrench className="size-4 shrink-0" />
          {t('technician.toolsAndPartsNotice')}
        </div>
      ) : null}

      <ProgressBar done={doneCount} total={job.items.length} />

      <div className="flex flex-col gap-3">
        {job.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 p-3">
              {item.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.attachments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setLightboxUrl(a.url)}
                      className="overflow-hidden rounded-md"
                    >
                      {isVideoUrl(a.url) ? (
                        <video src={a.url} className="h-24 w-24 object-cover" />
                      ) : (
                        <img src={a.url} alt="" className="h-24 w-24 object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-16 items-center justify-center gap-2 rounded-md bg-secondary text-xs text-muted-foreground">
                  <ImageOff className="size-4" />
                  {t('technician.noPhotoYet')}
                </div>
              )}

              <span className="font-medium">{displayText(item.title)}</span>

              <Textarea
                key={`${item.id}-${item.comment ?? ''}`}
                placeholder={t('technician.commentPlaceholder')}
                defaultValue={item.comment ?? ''}
                onBlur={(e) => updateItem(item.id, { comment: e.target.value })}
              />

              <p className="text-xs text-muted-foreground">{t('technician.confirmationHint')}</p>

              <div className="flex items-center gap-2">
                <CameraCaptureButton
                  ref={(handle) => {
                    captureButtonRefs.current[item.id] = handle
                  }}
                  label={t('common.attachPhotoVideo')}
                  onCapture={(photo) => handleCameraCapture(item.id, photo)}
                />
              </div>

              <Button
                type="button"
                variant={item.status === 'done' ? 'default' : 'outline'}
                onClick={() => handleToggleDone(item)}
              >
                <Check /> {item.status === 'done' ? t('technician.done') : t('technician.markDone')}
              </Button>
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
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{t('technician.signedOffThanks')}</p>
              {techSignOff?.signatureUrl ? (
                <img
                  src={techSignOff.signatureUrl}
                  alt={t('technician.signatureLabel')}
                  className="h-24 w-fit rounded-md border border-border bg-white p-1"
                />
              ) : null}
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleSignOff}>
              <Input
                placeholder={t('common.yourName')}
                value={signOffName}
                onChange={(e) => setSignOffName(e.target.value)}
                disabled={!allDone}
              />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('technician.signatureLabel')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      signaturePadRef.current?.clear()
                      setHasSignature(false)
                    }}
                    disabled={!allDone || !hasSignature}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <Eraser className="size-3.5" />
                    {t('technician.signatureClear')}
                  </button>
                </div>
                <SignaturePad
                  ref={signaturePadRef}
                  onChange={setHasSignature}
                  className={cn('h-32 w-full', !allDone && 'pointer-events-none opacity-50')}
                />
              </div>
              <Button type="submit" disabled={!allDone || !hasSignature || signingOff}>
                {t('common.signOff')}
              </Button>
            </form>
          )}
          {!allDone && !techSignedOff ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('technician.markAllDoneNotice')}</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className={cn('max-w-2xl border-none bg-transparent p-0 shadow-none')}>
          <DialogTitle className="sr-only">{t('common.attachPhotoVideo')}</DialogTitle>
          {lightboxUrl ? (
            isVideoUrl(lightboxUrl) ? (
              <video src={lightboxUrl} controls autoPlay className="w-full rounded-lg" />
            ) : (
              <img src={lightboxUrl} alt="" className="w-full rounded-lg" />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
