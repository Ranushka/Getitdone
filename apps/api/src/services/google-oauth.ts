import crypto from 'node:crypto'

// Short-lived in-memory CSRF state for the OAuth redirect round-trip — same
// pattern GMS uses for its ad-platform connect/callback flow (createState/consumeState
// in services/marketing/oauth.ts), just without the per-platform dimension since
// there's only one provider here.
const pendingStates = new Map<string, number>()

export function createState(): string {
  const state = crypto.randomBytes(24).toString('hex')
  pendingStates.set(state, Date.now() + 10 * 60 * 1000)
  return state
}

export function consumeState(state: string): boolean {
  const expiresAt = pendingStates.get(state)
  pendingStates.delete(state)
  if (!expiresAt) return false
  return expiresAt >= Date.now()
}

function getRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3659/api/auth/google/callback'
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface GoogleProfile {
  email: string
  name: string | null
  picture: string | null
}

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`)
  const tokens = (await tokenRes.json()) as { access_token: string }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) throw new Error(`Google profile fetch failed: ${await profileRes.text()}`)
  const profile = (await profileRes.json()) as { email?: string; name?: string; picture?: string }
  if (!profile.email) throw new Error('Google profile has no email')

  return { email: profile.email, name: profile.name ?? null, picture: profile.picture ?? null }
}
