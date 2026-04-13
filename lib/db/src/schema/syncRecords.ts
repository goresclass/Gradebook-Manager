import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const syncRecordsTable = pgTable("sync_records", {
  syncCode: text("sync_code").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SyncRecord = typeof syncRecordsTable.$inferSelect;
