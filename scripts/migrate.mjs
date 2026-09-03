// Applies db/schema.sql to whatever DATABASE_URL points at.
//   node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Pull it with `vercel env pull .env.local` first.')
  process.exit(1)
}

const sql = neon(url)
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')

// Strip `--` line comments FIRST, then split. Splitting first and discarding
// chunks that begin with a comment silently swallows the statement underneath
// the comment — which is how `attendees` went missing and took the availability
// foreign key down with it.
const statements = schema
  .split('\n')
  .filter((line) => !/^\s*--/.test(line))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  await sql.query(statement)
  console.log('ok  ' + statement.split('\n')[0].slice(0, 68))
}

console.log(`\napplied ${statements.length} statements`)
