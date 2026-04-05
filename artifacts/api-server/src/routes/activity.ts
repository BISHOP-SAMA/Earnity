import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, activityTable, usersTable, questsTable, rafflesTable, auctionsTable, stakingPoolsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/activity", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 100);
  const items = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(limit);
  res.json(items);
});

router.get("/activity/:walletAddress", async (req, res): Promise<void> => {
  const { walletAddress } = req.params;
  const walletAddr = walletAddress as string;
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 100);

  const items = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.walletAddress, walletAddr))
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);

  res.json(items);
});

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [questCount] = await db.select({ count: sql<number>`count(*)` }).from(questsTable);
  const [questCompletionCount] = await db.select({ count: sql<number>`count(*)` }).from(activityTable).where(eq(activityTable.type, "quest_completed"));
  const [raffleCount] = await db.select({ count: sql<number>`count(*)` }).from(rafflesTable);
  const [auctionCount] = await db.select({ count: sql<number>`count(*)` }).from(auctionsTable);
  const [poolCount] = await db.select({ count: sql<number>`count(*)` }).from(stakingPoolsTable);
  const [stakedTotal] = await db.select({ total: sql<number>`coalesce(sum(total_staked), 0)` }).from(stakingPoolsTable);
  const [pointsTotal] = await db.select({ total: sql<number>`coalesce(sum(points), 0)` }).from(usersTable);

  res.json({
    totalUsers: Number(userCount?.count ?? 0),
    totalQuests: Number(questCount?.count ?? 0),
    totalQuestCompletions: Number(questCompletionCount?.count ?? 0),
    totalRaffles: Number(raffleCount?.count ?? 0),
    totalAuctions: Number(auctionCount?.count ?? 0),
    totalStakingPools: Number(poolCount?.count ?? 0),
    totalValueStaked: Number(stakedTotal?.total ?? 0),
    totalPointsDistributed: Number(pointsTotal?.total ?? 0),
  });
});

export default router;
