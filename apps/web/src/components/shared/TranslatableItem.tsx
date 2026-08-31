import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type SupportedLang = 'en' | 'ar' | 'si' | 'ur' | 'hi'

/**
 * Like TranslatableText, but for a checklist item's title+comment pair — one
 * "Translate" control covers both fields instead of each getting its own
 * button. Only rendered when the UI language differs from the assumed
 * (English) content language.
 */
export function TranslatableItem({
  title,
  comment,
  titleClassName,
  commentClassName,
}: {
  title: string
  comment?: string | null
  titleClassName?: string
  commentClassName?: string
}) {
  const { t, i18n } = useTranslation()
  const utils = trpc.useUtils()
  const [translated, setTranslated] = useState<{ title: string; comment: string | null } | null>(null)
  const [showingOriginal, setShowingOriginal] = useState(true)
  const [loading, setLoading] = useState(false)

  const targetLang = (i18n.resolvedLanguage ?? i18n.language) as SupportedLang

  if (targetLang === 'en') {
    return (
      <>
        <span className={titleClassName}>{title}</span>
        {comment ? <p className={commentClassName}>{comment}</p> : null}
      </>
    )
  }

  const showTranslated = !showingOriginal && translated

  async function handleTranslate() {
    if (translated) {
      setShowingOriginal(false)
      return
    }
    setLoading(true)
    try {
      const [titleResult, commentResult] = await Promise.all([
        utils.translate.text.fetch({ text: title, targetLang }),
        comment ? utils.translate.text.fetch({ text: comment, targetLang }) : Promise.resolve(null),
      ])
      setTranslated({ title: titleResult.translated, comment: commentResult?.translated ?? null })
      setShowingOriginal(false)
    } catch {
      // Silently ignore — the "Translate" link just stays clickable to retry.
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span className={titleClassName}>{showTranslated ? translated.title : title}</span>
      {(showTranslated ? translated.comment : comment) ? (
        <p className={commentClassName}>{showTranslated ? translated.comment : comment}</p>
      ) : null}
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
    </>
  )
}
