import { sql } from 'drizzle-orm'
import {
  text,
  varchar,
  timestamp,
  pgTable,
  vector,
  index,
  decimal,
} from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { nanoid } from '@/lib/utils'

export const resources = pgTable('resources', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  content: text('content').notNull(),

  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
})

// Schema for resources - used to validate API requests
export const insertResourceSchema = createSelectSchema(resources)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>

export const embeddings = pgTable(
  'embeddings',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    resourceId: varchar('resource_id', { length: 191 }).references(
      () => resources.id,
      { onDelete: 'cascade' }
    ),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  (table) => [
    index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
)

export const transactions = pgTable('transactions', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  account: varchar('account', { length: 100 }).notNull(),
  date: varchar('date', { length: 50 }).notNull(),
  description: text('description').notNull(),
  credit: decimal('credit').notNull(),
  debit: decimal('debit').notNull(),
  balance: decimal('balance').notNull(),
  savingBalance: decimal('saving_balance').notNull(),
  subAccount: varchar('sub_account', { length: 255 }),
})
