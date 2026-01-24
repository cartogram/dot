/**
 * Database reset script
 *
 * Wipes all data from the database while preserving the schema.
 * Run with: pnpm tsx scripts/reset-db.ts
 */

import { config } from 'dotenv'

// Load env from .env.local first, then .env
config({ path: '.env.local' })
config({ path: '.env' })

import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Resetting database...')

  // Use raw SQL with TRUNCATE CASCADE for a clean reset
  // This handles all foreign key constraints automatically
  await pool.query(`
    TRUNCATE TABLE
      dashboard_cards,
      dashboard_invites,
      dashboard_profiles,
      dashboards,
      data_sources,
      users
    CASCADE
  `)

  console.log('All tables truncated.')
  console.log('\nDatabase reset complete!')
}

main()
  .catch(async (error) => {
    if (error.code === '42P01') {
      console.log('Some tables do not exist yet. Run `pnpm prisma db push` first.')
    } else {
      console.error(error)
    }
  })
  .finally(() => pool.end())
