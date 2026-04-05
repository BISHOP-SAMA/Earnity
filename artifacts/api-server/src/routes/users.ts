import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, usersTable, questCompletionsTable, raffleEntriesTable, bidsTable, stakePositionsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/users", async (req, res): Promise<void> => {
  const { walletAddress, username, avatarUrl } = req.body;

  if (!walletAddress) {
    res.status(400).json({ error: "walletAddress is required" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddress));

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ username: username ?? existing.username, avatarUrl: avatarUrl ?? existing.avatarUrl })
      .where(eq(usersTable.walletAddress, walletAddress))
      .returning();
    res.json(updated);
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ walletAddress, username, avatarUrl })
    .returning();

  res.json(user);
});

router.get("/users/:walletAddress", async (req, res): Promise<void> => {
  const { walletAddress } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddress as string));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.get("/users/:walletAddress/stats", async (req, res): Promise<void> => {
  const { walletAddress } = req.params;
  const walletAddr = walletAddress as string;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddr));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const raffleWins = await db
    .select({ count: sql<number>`count(*)` })
    .from(raffleEntriesTable)
    .where(eq(raffleEntriesTable.walletAddress, walletAddr));

  const stakeTotal = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(stakePositionsTable)
    .where(eq(stakePositionsTable.walletAddress, walletAddr));

  res.json({
    walletAddress: walletAddr,
    points: user.points,
    totalRewardsEarned: user.totalRewardsEarned,
    questsCompleted: user.questsCompleted,
    rafflesEntered: user.rafflesEntered,
    rafflesWon: 0,
    auctionsWon: 0,
    totalStaked: Number(stakeTotal[0]?.total ?? 0),
    rank: null,
  });
});

export default router;
