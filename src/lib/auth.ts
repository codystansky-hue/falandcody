// Passphrase gate. No accounts, no session store — the cookie *is* the session,
// and it only carries an expiry plus a scope, HMAC-signed so it can't be forged.
// Web Crypto only, so this runs unchanged in middleware (Edge) and route handlers.

export type Scope = 'guest' | 'admin'

export const GUEST_COOKIE = 'wedding_gate'
// Not a gate cookie: this one remembers WHICH guest a browser is, so returning
// to /rsvp edits their reply instead of adding a second one.
export const EDIT_COOKIE = 'wedding_guest'
export const ADMIN_COOKIE = 'wedding_admin'
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60

const enc = new TextEncoder()

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function key() {
  const secret = process.env.GATE_SECRET
  if (!secret) throw new Error('GATE_SECRET is not set')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
}

async function sign(payload: string) {
  return b64url(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload)))
}

// Length-independent comparison. Both operands here are fixed-length base64url
// digests, but comparing this way keeps it honest if that ever changes.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function issueToken(scope: Scope) {
  const payload = `${scope}.${Date.now() + MAX_AGE_SECONDS * 1000}`
  return `${payload}.${await sign(payload)}`
}

export async function verifyToken(token: string | undefined, scope: Scope) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [tokenScope, expiry, signature] = parts
  if (tokenScope !== scope) return false
  const expiresAt = Number(expiry)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
  try {
    return safeEqual(signature, await sign(`${tokenScope}.${expiry}`))
  } catch {
    return false
  }
}

// Passphrases are compared by digest so a wrong guess can't be timed against
// the real one character by character.
export async function passphraseMatches(supplied: string, expected: string | undefined) {
  if (!expected) return false
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(supplied)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  return safeEqual(b64url(a), b64url(b))
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}
