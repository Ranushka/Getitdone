import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { translations } from '@getitdone/db'

// Same OpenRouter integration pattern as GMS's AI copilot (services/ai/client.ts) —
// a cheap model is plenty for short translation strings.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  si: 'Sinhala',
  ur: 'Urdu',
  hi: 'Hindi',
}

function hashKey(text: string, targetLang: string): string {
  return crypto.createHash('sha256').update(`${text}|${targetLang}`).digest('hex')
}

async function callOpenRouter(text: string, targetLang: string): Promise<string> {
  const languageName = LANGUAGE_NAMES[targetLang] ?? targetLang
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a translation engine for a home/property maintenance job checklist app (plumbing, electrical, cleaning, general repairs). Translate the user's text into ${languageName}. Preserve technical terms accurately. Reply with ONLY the translated text, no quotes, no explanation.`,
        },
        { role: 'user', content: text },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices: { message: { content: string | null } }[] }
  const translated = data.choices[0]?.message?.content?.trim()
  if (!translated) throw new Error('OpenRouter returned an empty translation')
  return translated
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const sourceHash = hashKey(text, targetLang)

  const [cached] = await db
    .select()
    .from(translations)
    .where(eq(translations.sourceHash, sourceHash))
  if (cached) return cached.translatedText

  const translatedText = await callOpenRouter(text, targetLang)

  await db
    .insert(translations)
    .values({ sourceHash, sourceText: text, targetLang, translatedText })
    .onConflictDoNothing()

  return translatedText
}
