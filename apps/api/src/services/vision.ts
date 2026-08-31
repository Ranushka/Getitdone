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
    'This photo was taken during a vehicle repair/maintenance job. In one short sentence, describe the work or part condition shown (e.g. "Front brake pad worn to metal", "New oil filter installed"). Reply with ONLY the description, no preamble.',
  )
}

// Used by the "smart add" flow: a manager photographs something that needs
// attention and this generates the checklist item's title directly, rather
// than describing a photo already tied to an existing item.
export async function suggestChecklistItem(imageDataUrl: string): Promise<string> {
  return callVisionModel(
    imageDataUrl,
    'This photo shows something on a vehicle that needs repair or maintenance work. Write ONE short, actionable checklist item title for the to-do list a mechanic would work from (e.g. "Replace worn front brake pad", "Top up coolant", "Repair cracked windshield"). Reply with ONLY the title, no preamble, no trailing punctuation.',
  )
}
