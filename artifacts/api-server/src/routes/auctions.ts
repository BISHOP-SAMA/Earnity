import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, auctionsTable, bidsTable, usersTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/auctions", async (req, res): Promise<void> => {
  const { status } = req.query;
  const auctions = await db.select().from(auctionsTable).orderBy(desc(auctionsTable.createdAt));
  const filtered = auctions.filter((a) => {
    if (status && a.status !== status) return false;
    return true;
  });
  res.json(filtered);
});

router.post("/auctions", async (req, res): Promise<void> => {
  const { title, description, assetName, assetType, startingPrice, projectName, endsAt, createdByWallet } = req.body;

  if (!title || !description || !assetName || !createdByWallet) {
    res.status(400).json({ error: "title, description, assetName, createdByWallet are required" });
    return;
  }

  const [auction] = await db
    .insert(auctionsTable)
    .values({
      title,
      description,
      assetName,
      assetType: assetType ?? "nft",
      startingPrice: startingPrice ?? 0,
      currentBid: startingPrice ?? 0,
      projectName,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdByWallet,
      status: "active",
    })
    .returning();

  res.status(201).json(auction);
});

router.get("/auctions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, id));
  if (!auction) { res.status(404).json({ error: "Auction not found" }); return; }

  res.json(auction);
});

router.post("/auctions/:id/bid", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { walletAddress, amount } = req.body;
  if (!walletAddress || amount == null) { res.status(400).json({ error: "walletAddress and amount are required" }); return; }

  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, id));
  if (!auction) { res.status(404).json({ error: "Auction not found" }); return; }

  if (amount <= auction.currentBid) {
    res.status(400).json({ error: "Bid must be higher than current bid" });
    return;
  }

  const [bid] = await db
    .insert(bidsTable)
    .values({ auctionId: id, walletAddress, amount })
    .returning();

  await db
    .update(auctionsTable)
    .set({ currentBid: amount, currentBidderWallet: walletAddress, totalBids: auction.totalBids + 1 })
    .where(eq(auctionsTable.id, id));

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddress));
  if (existing) {
    await db.update(usersTable).set({ auctionsParticipated: existing.auctionsParticipated + 1 }).where(eq(usersTable.walletAddress, walletAddress));
  } else {
    await db.insert(usersTable).values({ walletAddress, auctionsParticipated: 1 });
  }

  await db.insert(activityTable).values({
    type: "bid_placed",
    walletAddress,
    description: `Placed bid of ${amount} on: ${auction.title}`,
    points: null,
  });

  res.json(bid);
});

router.get("/auctions/:id/bids", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const bids = await db.select().from(bidsTable).where(eq(bidsTable.auctionId, id)).orderBy(desc(bidsTable.placedAt));
  res.json(bids);
});

export default router;
