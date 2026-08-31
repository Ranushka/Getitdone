import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Trash2, Paperclip } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

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
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([{ title: '', attachmentUrls: [], uploading: false }])

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

  async function handleAttach(index: number, files: FileList | null) {
    if (!files || files.length === 0) return
    updateItem(index, { uploading: true })
    try {
      const urls = await Promise.all(Array.from(files).map(uploadFile))
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, attachmentUrls: [...it.attachmentUrls, ...urls], uploading: false } : it,
        ),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      updateItem(index, { uploading: false })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanItems = items.filter((it) => it.title.trim().length > 0)
    createJob.mutate({
      title,
      notes: notes || undefined,
      items: cleanItems.map((it) => ({ title: it.title, attachmentUrls: it.attachmentUrls })),
    })
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <h1 className="mb-4 text-xl font-bold">New job</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Checklist items</Label>
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`Item ${i + 1}`}
                    value={item.title}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
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
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Paperclip className="size-3.5" />
                    Attach photo/video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAttach(i, e.target.files)}
                    />
                  </label>
                  {item.uploading ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
                  {item.attachmentUrls.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {item.attachmentUrls.length} attached
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { title: '', attachmentUrls: [], uploading: false }])}
          >
            <Plus /> Add item
          </Button>
        </div>

        <Button type="submit" disabled={createJob.isPending || !title.trim()}>
          Create job
        </Button>
      </form>
    </div>
  )
}
