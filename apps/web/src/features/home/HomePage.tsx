import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  Users,
  FileCheck2,
  Globe,
  Wand2,
  Check,
  Link2,
  MessageCircle,
  FileSignature,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { cn } from '@/lib/utils'

const FEATURE_ICONS = [Camera, Users, FileCheck2, Globe, Wand2] as const
const HIGHLIGHT_ICONS = [Link2, MessageCircle, FileSignature] as const
const STEP_IMAGES = ['/images/step-create.png', '/images/step-share.png', '/images/step-confirm.png'] as const

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { retry: false })
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: '/dashboard' })
    }
  }, [isLoading, user, navigate])

  if (!isLoading && user) {
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

  const highlights = [1, 2, 3].map((n) => ({
    title: t(`home.highlight${n}Title`),
    desc: t(`home.highlight${n}Desc`),
    Icon: HIGHLIGHT_ICONS[n - 1],
  }))

  const steps = [1, 2, 3].map((n) => ({
    label: t(`home.step${n}Label`),
    title: t(`home.step${n}Title`),
    desc: t(`home.step${n}Desc`),
    bullets: [t(`home.step${n}Bullet1`), t(`home.step${n}Bullet2`)],
    image: STEP_IMAGES[n - 1],
  }))

  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`home.faq${n}Q`),
    a: t(`home.faq${n}A`),
  }))

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold">{t('app.name')}</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              {t('home.navFeatures')}
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              {t('home.navHowItWorks')}
            </a>
            <a href="#faq" className="hover:text-foreground">
              {t('home.navFaq')}
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{t('home.signIn')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">{t('home.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-5 text-left">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            {t('home.eyebrow')}
          </span>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{t('home.tagline')}</h1>
          <p className="max-w-lg text-lg text-muted-foreground">{t('home.subtitle')}</p>

          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {[t('home.valueProp1'), t('home.valueProp2'), t('home.valueProp3')].map((v) => (
              <li key={v} className="flex items-center gap-1.5 text-sm font-medium">
                <Check className="size-4 shrink-0 text-accent-foreground" />
                {v}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/login">
                {t('home.getStarted')} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">{t('home.seeHowItWorks')}</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('home.heroNote')}</p>
        </div>

        {/* Real screenshot of an actual GetItDone job */}
        <div className="relative mx-auto w-full max-w-md">
          <img
            src="/images/hero-job-detail.png"
            alt="A GetItDone job showing its checklist, price, and share link"
            className="w-full rotate-1 rounded-xl border border-border shadow-xl"
          />
          <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg sm:-left-8">
            <MessageCircle className="size-4 text-accent-foreground" />
            Sent to technician · 4F9HTN
          </div>
        </div>
      </section>

      {/* ── Highlight strip ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-accent/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          {highlights.map(({ title, desc, Icon }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-accent-foreground">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <span className="text-sm font-semibold text-accent-foreground">{t('home.stepsEyebrow')}</span>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t('home.stepsTitle')}</h2>
        </div>
        <div className="flex flex-col gap-12">
          {steps.map(({ label, title, desc, bullets, image }, i) => (
            <div
              key={label}
              className={cn(
                'grid items-center gap-8 md:grid-cols-2',
                i % 2 === 1 && 'md:[&>*:first-child]:order-2',
              )}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-accent-foreground">{label}</span>
                <h3 className="mt-1 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-muted-foreground">{desc}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="overflow-hidden">
                <CardContent className="grid place-items-center bg-secondary/40 p-6">
                  <img src={image} alt={title} className="max-h-80 w-full rounded-lg object-contain" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">{t('home.featuresTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <div className="mb-8 text-center">
          <span className="text-sm font-semibold text-accent-foreground">{t('home.faqEyebrow')}</span>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t('home.faqTitle')}</h2>
        </div>
        <div className="flex flex-col gap-2">
          {faqs.map(({ q, a }, i) => {
            const open = openFaq === i
            return (
              <div key={q} className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left font-medium"
                  aria-expanded={open}
                >
                  {q}
                  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </button>
                {open ? <p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p> : null}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="bg-accent">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-accent-foreground sm:text-3xl">{t('home.ctaTitle')}</h2>
          <p className="text-accent-foreground/80">{t('home.ctaSubtitle')}</p>
          <Button asChild size="lg" variant="outline" className="mt-2 bg-card">
            <Link to="/login">{t('home.getStarted')}</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <span className="text-lg font-bold">{t('app.name')}</span>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t('home.footerTagline')}</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">{t('home.footerProductHeading')}</h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  {t('home.footerLinkFeatures')}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  {t('home.footerLinkHowItWorks')}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  {t('home.footerLinkFaq')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">{t('home.footerAccountHeading')}</h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="hover:text-foreground">
                  {t('home.signIn')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground">
                  {t('home.getStarted')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          {t('home.footerRights', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  )
}
