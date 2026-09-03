import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function WhatsAppPage() {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const [resetting, setResetting] = useState(false)

  // Polls while pairing/connecting so a freshly-scanned QR code (or a
  // completed connection) shows up without the manager refreshing —
  // slows right down once connected since nothing changes after that.
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
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-bold">{t('whatsapp.heading')}</h1>
      <p className="text-sm text-muted-foreground">{t('whatsapp.explainer')}</p>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
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
    </div>
  )
}
