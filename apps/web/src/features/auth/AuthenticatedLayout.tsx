import { type ReactNode, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, BarChart3, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { data: user, isLoading, isError } = trpc.auth.me.useQuery(undefined, { retry: false })

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // `invalidate()` leaves the previous (still-authenticated) auth.me
      // result sitting in the cache until its background refetch resolves,
      // so whichever page mounts first after navigating reads stale data
      // and bounces off it (HomePage back to /dashboard, which then flips
      // to logged-out and redirects again to /login — never landing on
      // '/'). `reset()` clears that cached user synchronously, so the next
      // mount sees "logged out" immediately.
      await utils.auth.me.reset()
      navigate({ to: '/' })
    },
  })

  // Side-effecting navigation belongs in an effect, not the render body —
  // doing it inline used to race with other navigations (e.g. sign-out)
  // triggered in the same tick and could win, sending the user to the wrong
  // page.
  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isError, user, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (isError || !user) {
    return null
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <Link to="/dashboard" className="font-bold">
          GetItDone
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/templates"
            aria-label={t('templates.navLabel')}
            title={t('templates.navLabel')}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">{t('templates.navLabel')}</span>
          </Link>
          <Link
            to="/reports"
            aria-label={t('reports.navLabel')}
            title={t('reports.navLabel')}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">{t('reports.navLabel')}</span>
          </Link>
          <LanguageSwitcher />
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            <LogOut /> {t('auth.signOut')}
          </Button>
        </div>
      </header>
      {children}
    </div>
  )
}
