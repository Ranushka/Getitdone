// Same OpenRouter integration as services/translate.ts, but with an image
// content part — needs a vision-capable model, which is why this uses its
// own OPENROUTER_VISION_MODEL env var rather than OPENROUTER_MODEL (the
// translation/text model doesn't necessarily support image input).
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

async function callVisionModel(imageDataUrl: string, promptText: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenRouter vision request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices: { message: { content: string | null } }[] }
  const result = data.choices[0]?.message?.content?.trim()
  if (!result) throw new Error('OpenRouter returned an empty response')
  return result
}

// Used to caption an already-attached photo (autofills a checklist item's
// comment field).
export async function describePhoto(imageDataUrl: string): Promise<string> {
  return callVisionModel(
    imageDataUrl,
    'This photo was taken during a home/property maintenance or repair job (plumbing, electrical, cleaning, general handywork). In one short sentence, describe the work or condition shown (e.g. "Kitchen tap leaking at the base", "New light bulb installed"). Reply with ONLY the description, no preamble.',
  )
}

// Used by the "smart add" flow: a manager photographs something that needs
// attention and this generates the checklist item's title directly, rather
// than describing a photo already tied to an existing item.
export async function suggestChecklistItem(imageDataUrl: string): Promise<string> {
  return callVisionModel(
    imageDataUrl,
    'This photo shows something in a home or property that needs repair, maintenance, or cleaning. Write ONE short, actionable checklist item title for the to-do list a contractor would work from (e.g. "Fix leaking kitchen tap", "Replace hallway light bulb", "Clear blocked bathroom pipe"). Reply with ONLY the title, no preamble, no trailing punctuation.',
  )
}

// Used by the photo-first "New job" flow: a manager photographs a single
// problem before typing anything, and this drafts both the job title and a
// short checklist of concrete sub-tasks to fix it — one vision call covers
// everything for that photo, rather than one call per item.
export async function suggestJobFromPhoto(
  imageDataUrl: string,
): Promise<{ title: string; items: string[] }> {
  const raw = await callVisionModel(
    imageDataUrl,
    'This photo shows a problem in a home or property that needs repair, maintenance, or cleaning. ' +
      'Reply with ONLY a JSON object (no markdown fences, no preamble) shaped exactly like ' +
      '{"title": "short job title", "items": ["short actionable checklist item", "..."]}. ' +
      'The title should name the overall problem (e.g. "Fix kitchen tap leak"). ' +
      'Give 1 to 4 items, each a concrete step a contractor would tick off (e.g. "Replace worn washer", "Wipe down cabinet under sink", "Test tap for leaks").',
  )

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned) as { title?: unknown; items?: unknown }
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter((it): it is string => typeof it === 'string' && it.trim().length > 0)
      : []
    if (title && items.length > 0) return { title, items }
  } catch {
    // Falls through to the single-item fallback below.
  }

  // The model didn't return valid JSON — treat its raw reply as one item
  // title rather than failing the whole capture.
  return { title: raw, items: [raw] }
}
