import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Camera, Users, FileCheck2, Globe, Wand2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

const FEATURE_ICONS = [Camera, Users, FileCheck2, Globe, Wand2] as const

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { retry: false })

  if (!isLoading && user) {
    navigate({ to: '/dashboard' })
    return null
  }

  if (isLoading) {
    return <div className="min-h-dvh bg-background" />
  }

  const features = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`home.feature${n}Title`),
    desc: t(`home.feature${n}Desc`),
    Icon: FEATURE_ICONS[n - 1],
  }))

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <span className="font-bold">GetItDone</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button asChild size="sm">
            <Link to="/login">{t('home.signIn')}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('home.tagline')}</h1>
        <p className="max-w-xl text-muted-foreground">{t('home.subtitle')}</p>
        <Button asChild size="lg" className="mt-2">
          <Link to="/login">{t('home.getStarted')}</Link>
        </Button>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-6 text-center text-xl font-bold">{t('home.featuresTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ title, desc, Icon }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
