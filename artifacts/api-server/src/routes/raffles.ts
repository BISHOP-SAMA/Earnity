import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, rafflesTable, raffleEntriesTable, usersTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/raffles", async (req, res): Promise<void> => {
  const { status } = req.query;
  const raffles = await db.select().from(rafflesTable).orderBy(desc(rafflesTable.createdAt));
  const filtered = raffles.filter((r) => {
    if (status && r.status !== status) return false;
    return true;
  });
  res.json(filtered);
});

router.post("/raffles", async (req, res): Promise<void> => {
  const { title, description, rewardDescription, entryCostPoints, maxEntries, projectName, endsAt, createdByWallet } = req.body;

  if (!title || !description || !rewardDescription || !createdByWallet) {
    res.status(400).json({ error: "title, description, rewardDescription, createdByWallet are required" });
    return;
  }

  const [raffle] = await db
    .insert(rafflesTable)
    .values({
      title,
      description,
      rewardDescription,
      entryCostPoints: entryCostPoints ?? 0,
      maxEntries,
      projectName,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdByWallet,
      status: "active",
    })
    .returning();

  res.status(201).json(raffle);
});

router.get("/raffles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [raffle] = await db.select().from(rafflesTable).where(eq(rafflesTable.id, id));
  if (!raffle) { res.status(404).json({ error: "Raffle not found" }); return; }

  res.json(raffle);
});

router.post("/raffles/:id/enter", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { walletAddress, ticketCount } = req.body;
  if (!walletAddress) { res.status(400).json({ error: "walletAddress is required" }); return; }

  const [raffle] = await db.select().from(rafflesTable).where(eq(rafflesTable.id, id));
  if (!raffle) { res.status(404).json({ error: "Raffle not found" }); return; }

  const tickets = ticketCount ?? 1;

  const [entry] = await db
    .insert(raffleEntriesTable)
    .values({ raffleId: id, walletAddress, ticketCount: tickets })
    .returning();

  await db
    .update(rafflesTable)
    .set({ totalEntries: raffle.totalEntries + tickets })
    .where(eq(rafflesTable.id, id));

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddress));
  if (existing) {
    await db.update(usersTable).set({
      rafflesEntered: existing.rafflesEntered + 1,
      points: Math.max(0, existing.points - raffle.entryCostPoints * tickets),
    }).where(eq(usersTable.walletAddress, walletAddress));
  } else {
    await db.insert(usersTable).values({ walletAddress, rafflesEntered: 1 });
  }

  await db.insert(activityTable).values({
    type: "raffle_entered",
    walletAddress,
    description: `Entered raffle: ${raffle.title}`,
    points: -(raffle.entryCostPoints * tickets),
  });

  res.json(entry);
});

export default router;
