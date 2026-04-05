import { pgTable, text, serial, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardPoints: integer("reward_points").notNull().default(0),
  rewardTokens: doublePrecision("reward_tokens").notNull().default(0),
  requirements: text("requirements"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"),
  projectName: text("project_name"),
  totalCompletions: integer("total_completions").notNull().default(0),
  maxCompletions: integer("max_completions"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdByWallet: text("created_by_wallet").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestSchema = createInsertSchema(questsTable).omit({ id: true, createdAt: true, totalCompletions: true });
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof questsTable.$inferSelect;

export const questCompletionsTable = pgTable("quest_completions", {
  id: serial("id").primaryKey(),
  questId: integer("quest_id").notNull().references(() => questsTable.id),
  walletAddress: text("wallet_address").notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  tokensEarned: doublePrecision("tokens_earned").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestCompletionSchema = createInsertSchema(questCompletionsTable).omit({ id: true, completedAt: true });
export type InsertQuestCompletion = z.infer<typeof insertQuestCompletionSchema>;
export type QuestCompletion = typeof questCompletionsTable.$inferSelect;
