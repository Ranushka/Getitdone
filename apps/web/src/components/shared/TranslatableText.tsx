import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type SupportedLang = 'en' | 'ar' | 'si' | 'ur' | 'hi'

export function TranslatableText({ text, className }: { text: string; className?: string }) {
  const { t, i18n } = useTranslation()
  const [translated, setTranslated] = useState<string | null>(null)
  const [showingOriginal, setShowingOriginal] = useState(true)
  const utils = trpc.useUtils()
  const [loading, setLoading] = useState(false)

  const targetLang = (i18n.resolvedLanguage ?? i18n.language) as SupportedLang

  async function handleTranslate() {
    if (translated) {
      setShowingOriginal(false)
      return
    }
    setLoading(true)
    try {
      const result = await utils.translate.text.fetch({ text, targetLang })
      setTranslated(result.translated)
      setShowingOriginal(false)
    } catch {
      // Silently ignore — the "Translate" link just stays clickable to retry.
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className={className}>
      <span>{showingOriginal || !translated ? text : translated}</span>{' '}
      {showingOriginal ? (
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="inline-flex items-center gap-0.5 text-xs font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Languages className="size-3" />
          {loading ? t('translate.translating') : t('translate.translate')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowingOriginal(true)}
          className="text-xs font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {t('translate.showOriginal')}
        </button>
      )}
    </span>
  )
}
