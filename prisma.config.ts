import 'dotenv/config'

import path from 'node:path'
import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";

import dotenv from 'dotenv'

dotenv.config({ path: ['.env.local', '.env'] })

export default {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts',
  },
  datasource: { 
    url: env("DATABASE_URL") 
  }
} satisfies PrismaConfig;