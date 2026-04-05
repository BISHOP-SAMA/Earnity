import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, questsTable, questCompletionsTable, usersTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/quests", async (req, res): Promise<void> => {
  const { status, projectId } = req.query;

  let query = db.select().from(questsTable).orderBy(desc(questsTable.createdAt));

  const quests = await db.select().from(questsTable).orderBy(desc(questsTable.createdAt));
  const filtered = quests.filter((q) => {
    if (status && q.status !== status) return false;
    return true;
  });

  res.json(filtered);
});

router.post("/quests", async (req, res): Promise<void> => {
  const { title, description, rewardPoints, rewardTokens, requirements, projectName, maxCompletions, expiresAt, createdByWallet } = req.body;

  if (!title || !description || !createdByWallet) {
    res.status(400).json({ error: "title, description, createdByWallet are required" });
    return;
  }

  const [quest] = await db
    .insert(questsTable)
    .values({
      title,
      description,
      rewardPoints: rewardPoints ?? 0,
      rewardTokens: rewardTokens ?? 0,
      requirements,
      projectName,
      maxCompletions,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdByWallet,
      status: "active",
    })
    .returning();

  res.status(201).json(quest);
});

router.get("/quests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, id));
  if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }

  res.json(quest);
});

router.post("/quests/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { walletAddress } = req.body;
  if (!walletAddress) { res.status(400).json({ error: "walletAddress is required" }); return; }

  const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, id));
  if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }

  const [completion] = await db
    .insert(questCompletionsTable)
    .values({ questId: id, walletAddress, pointsEarned: quest.rewardPoints, tokensEarned: quest.rewardTokens })
    .returning();

  await db
    .update(questsTable)
    .set({ totalCompletions: quest.totalCompletions + 1 })
    .where(eq(questsTable.id, id));

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddress));
  if (existing) {
    await db.update(usersTable).set({
      points: existing.points + quest.rewardPoints,
      questsCompleted: existing.questsCompleted + 1,
      totalRewardsEarned: existing.totalRewardsEarned + quest.rewardTokens,
    }).where(eq(usersTable.walletAddress, walletAddress));
  } else {
    await db.insert(usersTable).values({ walletAddress, points: quest.rewardPoints, questsCompleted: 1, totalRewardsEarned: quest.rewardTokens });
  }

  await db.insert(activityTable).values({
    type: "quest_completed",
    walletAddress,
    description: `Completed quest: ${quest.title}`,
    points: quest.rewardPoints,
  });

  res.json(completion);
});

export default router;
