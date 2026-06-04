import 'dotenv/config'

import path from 'node:path'
import { env } from 'prisma/config'

import dotenv from 'dotenv'
import type { PrismaConfig } from 'prisma'

dotenv.config({ path: ['.env.local', '.env'] })

export default {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
} satisfies PrismaConfig
