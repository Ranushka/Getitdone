import { type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
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
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (isError || !user) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <span className="font-bold">GetItDone</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      {children}
    </div>
  )
}
