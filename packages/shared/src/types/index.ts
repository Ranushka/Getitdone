// Plain string-union mirrors of the Drizzle pgEnums, kept dependency-free so
// the web app doesn't need to import @getitdone/db into its client bundle.
export type JobStatus = 'in_progress' | 'tech_signed_off' | 'completed'
export type ItemStatus = 'pending' | 'done'
export type SignOffRole = 'technician' | 'manager'

export interface JwtPayload {
  sub: number
  iat?: number
  exp?: number
}
