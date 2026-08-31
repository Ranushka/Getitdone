import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en/common.json'
import ar from '../locales/ar/common.json'
import si from '../locales/si/common.json'
import ur from '../locales/ur/common.json'
import hi from '../locales/hi/common.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
] as const

const RTL_LANGS = new Set(['ar', 'ur'])

function applyDirection(lang: string) {
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      si: { common: si },
      ur: { common: ur },
      hi: { common: hi },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'si', 'ur', 'hi'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

applyDirection(i18n.resolvedLanguage ?? i18n.language ?? 'en')
i18n.on('languageChanged', applyDirection)

export default i18n
