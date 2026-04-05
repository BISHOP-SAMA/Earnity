import { pgTable, text, serial, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stakingPoolsTable = pgTable("staking_pools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  apr: doublePrecision("apr").notNull().default(0),
  minStake: doublePrecision("min_stake").notNull().default(0),
  maxStake: doublePrecision("max_stake"),
  totalStaked: doublePrecision("total_staked").notNull().default(0),
  totalStakers: integer("total_stakers").notNull().default(0),
  durationDays: integer("duration_days"),
  status: text("status").notNull().default("active"),
  projectName: text("project_name"),
  createdByWallet: text("created_by_wallet").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStakingPoolSchema = createInsertSchema(stakingPoolsTable).omit({ id: true, createdAt: true, totalStaked: true, totalStakers: true });
export type InsertStakingPool = z.infer<typeof insertStakingPoolSchema>;
export type StakingPool = typeof stakingPoolsTable.$inferSelect;

export const stakePositionsTable = pgTable("stake_positions", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull().references(() => stakingPoolsTable.id),
  walletAddress: text("wallet_address").notNull(),
  amount: doublePrecision("amount").notNull(),
  rewardsEarned: doublePrecision("rewards_earned").notNull().default(0),
  stakedAt: timestamp("staked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStakePositionSchema = createInsertSchema(stakePositionsTable).omit({ id: true, stakedAt: true, rewardsEarned: true });
export type InsertStakePosition = z.infer<typeof insertStakePositionSchema>;
export type StakePosition = typeof stakePositionsTable.$inferSelect;
