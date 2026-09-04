import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, RefreshCw, Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type AddressType } from '@getitdone/shared'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-24">
      <h1 className="text-xl font-bold">{t('settings.heading')}</h1>
      <AddressBookSection />
      <WhatsAppSection />
    </div>
  )
}

// Moved here from the standalone /whatsapp page — pairing/connection status
// is a one-time setup step, not something a manager visits day to day, so
// it belongs alongside other account-level config rather than in the main
// nav next to Jobs/Calendar/Reports.
function WhatsAppSection() {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const [resetting, setResetting] = useState(false)

  const { data, isLoading } = trpc.whatsapp.status.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data?.status === 'connected' ? 30_000 : 3_000),
  })

  const reset = trpc.whatsapp.reset.useMutation({
    onSuccess: async () => {
      await utils.whatsapp.status.invalidate()
      setResetting(false)
    },
    onError: (err) => {
      toast.error(err.message)
      setResetting(false)
    },
  })

  function handleReset() {
    setResetting(true)
    reset.mutate()
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{t('whatsapp.heading')}</h2>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <p className="text-sm text-muted-foreground">{t('whatsapp.explainer')}</p>

          {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

          {!isLoading && data?.status === 'connected' ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="font-medium">{t('whatsapp.connected')}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
                <RefreshCw /> {t('whatsapp.rePair')}
              </Button>
            </div>
          ) : null}

          {!isLoading && data?.status === 'qr' && data.qrDataUrl ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <img src={data.qrDataUrl} alt={t('whatsapp.scanAlt')} className="size-56 rounded-lg border border-border" />
              <p className="text-sm text-muted-foreground">{t('whatsapp.scanInstructions')}</p>
            </div>
          ) : null}

          {!isLoading && (data?.status === 'connecting' || data?.status === 'disconnected') ? (
            <p className="text-sm text-muted-foreground">{t('whatsapp.waitingForQr')}</p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}

interface AddressFormState {
  id?: number
  label: string
  line1: string
  type: AddressType
}

const EMPTY_ADDRESS_FORM: AddressFormState = { label: '', line1: '', type: 'home' }

// New CRUD surface — previously an address could only be created inline
// while creating a job (AddressAndScheduleFields), with no way to view,
// fix a typo in, or remove one afterward.
function AddressBookSection() {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const { data: addresses, isLoading } = trpc.addresses.list.useQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM)

  const invalidate = () => utils.addresses.list.invalidate()

  const createAddress = trpc.addresses.create.useMutation({
    onSuccess: async () => {
      await invalidate()
      toast.success(t('settings.addressSaved'))
      setDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateAddress = trpc.addresses.update.useMutation({
    onSuccess: async () => {
      await invalidate()
      toast.success(t('settings.addressSaved'))
      setDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteAddress = trpc.addresses.delete.useMutation({
    onSuccess: async () => {
      await invalidate()
      toast.success(t('settings.addressDeleted'))
    },
    onError: (err) => toast.error(err.message),
  })

  function openNew() {
    setForm(EMPTY_ADDRESS_FORM)
    setDialogOpen(true)
  }

  function openEdit(address: AddressFormState) {
    setForm(address)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.label.trim() || !form.line1.trim()) return
    const payload = { label: form.label.trim(), line1: form.line1.trim(), type: form.type }
    if (form.id) {
      updateAddress.mutate({ id: form.id, ...payload })
    } else {
      createAddress.mutate(payload)
    }
  }

  const saving = createAddress.isPending || updateAddress.isPending

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('settings.addressBookHeading')}</h2>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus /> {t('settings.addAddress')}
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {!isLoading && addresses?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('settings.noAddressesYet')}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {addresses?.map((address) => (
          <Card key={address.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3">
              <div className="flex min-w-0 items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{address.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{address.line1}</span>
                  <span className="text-xs text-muted-foreground">
                    {address.type === 'office' ? t('jobs.addressTypeOffice') : t('jobs.addressTypeHome')}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(address)}>
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAddress.mutate({ id: address.id })}
                  disabled={deleteAddress.isPending}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t('settings.editAddress') : t('settings.addAddress')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLabel">{t('jobs.addressLabelPlaceholder')}</Label>
              <Input
                id="addressLabel"
                autoFocus
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine1">{t('jobs.addressLine1Placeholder')}</Label>
              <Input
                id="addressLine1"
                value={form.line1}
                onChange={(e) => setForm((prev) => ({ ...prev, line1: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              {(['home', 'office'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type }))}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium',
                    form.type === type
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-card text-muted-foreground',
                  )}
                >
                  {type === 'home' ? t('jobs.addressTypeHome') : t('jobs.addressTypeOffice')}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={!form.label.trim() || !form.line1.trim() || saving}>
              {t('settings.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
