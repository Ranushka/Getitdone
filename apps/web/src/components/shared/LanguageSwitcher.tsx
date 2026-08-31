import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()

  return (
    <select
      aria-label="Language"
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={cn(
        'h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  )
}
