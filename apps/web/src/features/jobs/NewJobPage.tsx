import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CameraCaptureButton, type CapturedPhoto } from '@/components/shared/CameraCaptureButton'

interface ItemDraft {
  title: string
  attachmentUrls: string[]
  uploading: boolean
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Upload failed')
  }
  const { url } = await res.json()
  return url
}

export function NewJobPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const suggestItem = trpc.photos.suggestItem.useMutation()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [technicianPhone, setTechnicianPhone] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([{ title: '', attachmentUrls: [], uploading: false }])
  const [smartAdding, setSmartAdding] = useState(false)
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const focusIndexRef = useRef<number | null>(null)

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      itemInputRefs.current[focusIndexRef.current]?.focus()
      focusIndexRef.current = null
    }
  }, [items.length])

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: async (job) => {
      await utils.jobs.list.invalidate()
      navigate({ to: '/jobs/$jobId', params: { jobId: String(job.id) } })
    },
    onError: (err) => toast.error(err.message),
  })

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  async function handleItemCapture(index: number, photo: CapturedPhoto) {
    updateItem(index, { uploading: true })
    try {
      const url = await uploadFile(photo.file)
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, attachmentUrls: [...it.attachmentUrls, url], uploading: false } : it)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      updateItem(index, { uploading: false })
    }
  }

  // "Smart add" — take a photo of whatever needs work, and let the vision
  // model turn it directly into a new checklist item instead of the manager
  // having to type one out.
  async function handleSmartAddCapture(photo: CapturedPhoto) {
    setSmartAdding(true)
    try {
      const [url, { title: suggestedTitle }] = await Promise.all([
        uploadFile(photo.file),
        suggestItem.mutateAsync({ imageDataUrl: photo.dataUrl }),
      ])
      focusIndexRef.current = items.length
      setItems((prev) => [...prev, { title: suggestedTitle, attachmentUrls: [url], uploading: false }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate an item from that photo')
    } finally {
      setSmartAdding(false)
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (index === items.length - 1) {
      focusIndexRef.current = index + 1
      setItems((prev) => [...prev, { title: '', attachmentUrls: [], uploading: false }])
    } else {
      itemInputRefs.current[index + 1]?.focus()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanItems = items.filter((it) => it.title.trim().length > 0)
    createJob.mutate({
      title,
      notes: notes || undefined,
      price: price.trim() ? Number(price) : undefined,
      technicianPhone: technicianPhone.trim() || undefined,
      items: cleanItems.map((it) => ({ title: it.title, attachmentUrls: it.attachmentUrls })),
    })
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <h1 className="mb-4 text-xl font-bold">{t('jobs.newJobHeading')}</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t('jobs.titleLabel')}</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">{t('jobs.notesLabel')}</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">{t('jobs.priceLabel')}</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="technicianPhone">{t('jobs.technicianPhoneLabel')}</Label>
            <Input
              id="technicianPhone"
              type="tel"
              placeholder={t('jobs.technicianPhonePlaceholder')}
              value={technicianPhone}
              onChange={(e) => setTechnicianPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t('jobs.checklistItemsLabel')}</Label>
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    ref={(el) => {
                      itemInputRefs.current[i] = el
                    }}
                    placeholder={t('jobs.itemPlaceholder', { number: i + 1 })}
                    value={item.title}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
                    onKeyDown={(e) => handleItemKeyDown(e, i)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={items.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CameraCaptureButton
                    label={t('common.attachPhotoVideo')}
                    onCapture={(photo) => handleItemCapture(i, photo)}
                  />
                  {item.uploading ? (
                    <span className="text-xs text-muted-foreground">{t('common.uploading')}</span>
                  ) : null}
                  {item.attachmentUrls.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t('common.attachedCount', { count: item.attachmentUrls.length })}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-end gap-2">
            {smartAdding ? (
              <span className="text-xs text-muted-foreground">{t('jobs.smartAdding')}</span>
            ) : null}
            <CameraCaptureButton
              icon={Wand2}
              label={t('jobs.smartAddItem')}
              onCapture={handleSmartAddCapture}
              size="sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { title: '', attachmentUrls: [], uploading: false }])}
            >
              <Plus /> {t('jobs.addItem')}
            </Button>
          </div>
        </div>

        <Button type="submit" disabled={createJob.isPending || !title.trim()}>
          {t('jobs.createJob')}
        </Button>
      </form>
    </div>
  )
}
