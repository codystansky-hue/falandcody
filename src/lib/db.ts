import { neon } from '@neondatabase/serverless'

// Neon's HTTP driver — no pool to manage, which is what we want on serverless.
// The site has to render before a database exists, so callers check isDbReady()
// rather than trusting the connection.
export const isDbReady = () => Boolean(process.env.DATABASE_URL)

let cached: ReturnType<typeof neon> | null = null

export function db() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  if (!cached) cached = neon(url)
  return cached
}
