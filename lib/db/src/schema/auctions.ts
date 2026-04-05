import { pgTable, text, serial, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auctionsTable = pgTable("auctions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assetName: text("asset_name").notNull(),
  assetType: text("asset_type").notNull().default("nft"),
  imageUrl: text("image_url"),
  startingPrice: doublePrecision("starting_price").notNull().default(0),
  currentBid: doublePrecision("current_bid").notNull().default(0),
  currentBidderWallet: text("current_bidder_wallet"),
  totalBids: integer("total_bids").notNull().default(0),
  status: text("status").notNull().default("active"),
  projectName: text("project_name"),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdByWallet: text("created_by_wallet").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuctionSchema = createInsertSchema(auctionsTable).omit({ id: true, createdAt: true, totalBids: true, currentBid: true });
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctionsTable.$inferSelect;

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctionsTable.id),
  walletAddress: text("wallet_address").notNull(),
  amount: doublePrecision("amount").notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, placedAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
