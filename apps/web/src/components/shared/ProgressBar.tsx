import { useTranslation } from 'react-i18next'

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation()
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {t('common.progress', { done, total })}
      </span>
    </div>
  )
}
