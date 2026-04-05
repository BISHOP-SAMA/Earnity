import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rafflesTable = pgTable("raffles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardDescription: text("reward_description").notNull(),
  imageUrl: text("image_url"),
  entryCostPoints: integer("entry_cost_points").notNull().default(0),
  maxEntries: integer("max_entries"),
  totalEntries: integer("total_entries").notNull().default(0),
  status: text("status").notNull().default("active"),
  winnerWallet: text("winner_wallet"),
  projectName: text("project_name"),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdByWallet: text("created_by_wallet").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRaffleSchema = createInsertSchema(rafflesTable).omit({ id: true, createdAt: true, totalEntries: true });
export type InsertRaffle = z.infer<typeof insertRaffleSchema>;
export type Raffle = typeof rafflesTable.$inferSelect;

export const raffleEntriesTable = pgTable("raffle_entries", {
  id: serial("id").primaryKey(),
  raffleId: integer("raffle_id").notNull().references(() => rafflesTable.id),
  walletAddress: text("wallet_address").notNull(),
  ticketCount: integer("ticket_count").notNull().default(1),
  enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRaffleEntrySchema = createInsertSchema(raffleEntriesTable).omit({ id: true, enteredAt: true });
export type InsertRaffleEntry = z.infer<typeof insertRaffleEntrySchema>;
export type RaffleEntry = typeof raffleEntriesTable.$inferSelect;
