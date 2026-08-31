import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate()
      navigate({ to: '/' })
    },
    onError: (err) => toast.error(err.message),
  })

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success(t('auth.accountCreated'))
      setMode('login')
      setConfirmPassword('')
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'login') {
      login.mutate({ email, password })
    } else {
      register.mutate({ email, password, confirmPassword })
    }
  }

  const pending = login.isPending || register.isPending

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">GetItDone</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? t('auth.signInSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>
          <LanguageSwitcher />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === 'register' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            ) : null}
            <Button type="submit" disabled={pending}>
              {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
            </Button>
          </form>

          <Button variant="outline" asChild>
            <a href="/api/auth/google/start">{t('auth.continueWithGoogle')}</a>
          </Button>

          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? t('auth.toRegister') : t('auth.toSignIn')}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
