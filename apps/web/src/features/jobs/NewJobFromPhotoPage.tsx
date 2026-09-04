import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Trash2, Wand2, ClipboardList, Camera, X, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { CameraCaptureButton, type CapturedPhoto } from '@/components/shared/CameraCaptureButton'
import { AddressAndScheduleFields, type AddressAndScheduleValue } from '@/components/shared/AddressAndScheduleFields'

interface ItemDraft {
  title: string
  attachmentUrls: string[]
  uploading: boolean
}

interface ProblemPhoto {
  previewUrl: string
  generating: boolean
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

// Photo-first take on job creation: instead of typing a title and checklist
// from scratch, the manager photographs each problem first and an AI vision
// call drafts a title + a short checklist per photo — reviewed/edited below
// exactly like the manual flow (NewJobPage), which stays the default entry
// point for jobs with nothing to photograph yet.
export function NewJobFromPhotoPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const suggestItem = trpc.photos.suggestItem.useMutation()
  const suggestJobItems = trpc.photos.suggestJobItems.useMutation()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [technicianPhone, setTechnicianPhone] = useState('')
  const [needsToolsAndParts, setNeedsToolsAndParts] = useState(false)
  const [items, setItems] = useState<ItemDraft[]>([])
  const [problemPhotos, setProblemPhotos] = useState<ProblemPhoto[]>([])
  const [addressAndSchedule, setAddressAndSchedule] = useState<AddressAndScheduleValue>({ hasScheduleConflict: false })
  const [smartAdding, setSmartAdding] = useState(false)
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const focusIndexRef = useRef<number | null>(null)
  const titleSetByAi = useRef(false)

  const { data: templates } = trpc.templates.list.useQuery()

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

  // Each photo is treated as its own problem: uploaded once, then drafted
  // into a title suggestion (only used if the manager hasn't typed one yet)
  // plus its own checklist items, appended to whatever's already there —
  // so several photos in one visit (leaky pipe + broken bulb) merge into
  // one combined checklist.
  async function handleProblemPhotoCapture(photo: CapturedPhoto) {
    const photoIndex = problemPhotos.length
    setProblemPhotos((prev) => [...prev, { previewUrl: photo.dataUrl, generating: true }])

    try {
      const [url, draft] = await Promise.all([
        uploadFile(photo.file),
        suggestJobItems.mutateAsync({ imageDataUrl: photo.dataUrl }),
      ])

      if (!titleSetByAi.current && !title.trim()) {
        setTitle(draft.title)
        titleSetByAi.current = true
      }

      setItems((prev) => [
        ...prev,
        ...draft.items.map((itemTitle) => ({ title: itemTitle, attachmentUrls: [url], uploading: false })),
      ])
      setProblemPhotos((prev) => prev.map((p, i) => (i === photoIndex ? { ...p, generating: false } : p)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate a checklist from that photo')
      setProblemPhotos((prev) => prev.filter((_, i) => i !== photoIndex))
    }
  }

  function removeProblemPhoto(index: number) {
    setProblemPhotos((prev) => prev.filter((_, i) => i !== index))
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

  function handleApplyTemplate(templateItems: { title: string }[]) {
    setItems(templateItems.map((it) => ({ title: it.title, attachmentUrls: [], uploading: false })))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (addressAndSchedule.hasScheduleConflict) {
      toast.error(t('jobs.scheduleConflictBlocked'))
      return
    }
    const cleanItems = items.filter((it) => it.title.trim().length > 0)
    createJob.mutate({
      title,
      notes: notes || undefined,
      price: price.trim() ? Number(price) : undefined,
      technicianPhone: technicianPhone.trim() || undefined,
      needsToolsAndParts,
      items: cleanItems.map((it) => ({ title: it.title, attachmentUrls: it.attachmentUrls })),
      addressId: addressAndSchedule.addressId,
      newAddress: addressAndSchedule.newAddress,
      scheduledAt: addressAndSchedule.scheduledAt,
    })
  }

  const anyPhotoGenerating = problemPhotos.some((p) => p.generating)

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('jobs.newJobFromPhotoHeading')}</h1>
        <Button asChild variant="ghost" size="sm">
          <Link to="/jobs/new">
            <Type /> {t('jobs.fillInManually')}
          </Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted-foreground">{t('jobs.photoFirstHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {problemPhotos.map((photo, i) => (
              <div key={i} className="relative">
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="size-16 rounded-lg border border-border object-cover"
                />
                {photo.generating ? (
                  <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/40 text-[10px] font-medium text-white">
                    {t('jobs.smartAdding')}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeProblemPhoto(i)}
                    className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
            <CameraCaptureButton
              icon={Camera}
              label={problemPhotos.length > 0 ? t('jobs.addAnotherPhoto') : t('jobs.takeAPhoto')}
              onCapture={handleProblemPhotoCapture}
            />
          </div>
        </CardContent>
      </Card>

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

        <label htmlFor="needsToolsAndParts" className="flex items-center gap-2 text-sm">
          <input
            id="needsToolsAndParts"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={needsToolsAndParts}
            onChange={(e) => setNeedsToolsAndParts(e.target.checked)}
          />
          {t('jobs.needsToolsAndPartsLabel')}
        </label>

        <AddressAndScheduleFields onChange={setAddressAndSchedule} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{t('jobs.checklistItemsLabel')}</Label>
            <div className="flex items-center gap-2">
              {templates && templates.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <ClipboardList /> {t('jobs.loadTemplate')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {templates.map((template) => (
                      <DropdownMenuItem key={template.id} onSelect={() => handleApplyTemplate(template.items)}>
                        {template.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('jobs.noItemsYetPhotoHint')}</p>
          ) : null}
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

        <Button
          type="submit"
          disabled={
            createJob.isPending || !title.trim() || addressAndSchedule.hasScheduleConflict || anyPhotoGenerating
          }
        >
          {t('jobs.createJob')}
        </Button>
      </form>
    </div>
  )
}
