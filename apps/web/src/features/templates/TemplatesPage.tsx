import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function TemplatesPage() {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const { data: templates, isLoading } = trpc.templates.list.useQuery()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [itemTitles, setItemTitles] = useState([''])

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate()
      toast.success(t('templates.created'))
      setCreateOpen(false)
      setName('')
      setItemTitles([''])
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate()
      toast.success(t('templates.deleted'))
    },
    onError: (err) => toast.error(err.message),
  })

  function updateItemTitle(index: number, value: string) {
    setItemTitles((prev) => prev.map((title, i) => (i === index ? value : title)))
  }

  function handleCreate() {
    const items = itemTitles.map((title) => title.trim()).filter(Boolean)
    if (!name.trim() || items.length === 0) return
    createTemplate.mutate({ name: name.trim(), items })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('templates.heading')}</h1>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> {t('templates.newTemplate')}
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {!isLoading && templates?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('templates.noTemplatesYet')}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                {template.name}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteTemplate.mutate({ id: template.id })}
                disabled={deleteTemplate.isPending}
              >
                <Trash2 />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {template.items.map((item) => (
                  <li key={item.id}>• {item.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.newTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="templateName">{t('templates.nameLabel')}</Label>
              <Input id="templateName" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('jobs.checklistItemsLabel')}</Label>
              {itemTitles.map((value, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={t('jobs.itemPlaceholder', { number: i + 1 })}
                    value={value}
                    onChange={(e) => updateItemTitle(i, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemTitles((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={itemTitles.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-end"
                onClick={() => setItemTitles((prev) => [...prev, ''])}
              >
                <Plus /> {t('jobs.addItem')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || itemTitles.every((title) => !title.trim()) || createTemplate.isPending}
            >
              {t('templates.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
