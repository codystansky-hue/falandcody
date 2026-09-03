// Applies db/schema.sql to whatever DATABASE_URL points at.
//   node scripts/migrate.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Pull it with `vercel env pull .env.local` first.')
  process.exit(1)
}

const sql = neon(url)
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')

// neon()'s tagged-template form is one statement per call, so split on the
// statement terminator and run them in order.
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'))

for (const statement of statements) {
  await sql.query(statement)
  console.log('ok  ' + statement.split('\n')[0].slice(0, 72))
}

console.log(`\napplied ${statements.length} statements`)
