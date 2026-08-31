import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function ShareLinkBox({ shareToken }: { shareToken: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/t/${shareToken}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${t('share.whatsappMessagePrefix')}: ${url}`)}`

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/50 p-3 sm:flex-row sm:items-center">
      <input
        readOnly
        value={url}
        className="min-w-0 flex-1 truncate bg-transparent text-sm text-muted-foreground outline-none"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? t('share.copied') : t('share.copy')}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            {t('share.whatsapp')}
          </a>
        </Button>
      </div>
    </div>
  )
}
