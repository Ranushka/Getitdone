import { type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
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
      await utils.auth.me.invalidate()
      navigate({ to: '/login' })
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (isError || !user) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <Link to="/" className="font-bold">
          GetItDone
        </Link>
        <div className="flex items-center gap-3">
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
