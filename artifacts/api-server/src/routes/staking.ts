import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, stakingPoolsTable, stakePositionsTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/staking/pools", async (_req, res): Promise<void> => {
  const pools = await db.select().from(stakingPoolsTable).orderBy(desc(stakingPoolsTable.createdAt));
  res.json(pools);
});

router.post("/staking/pools", async (req, res): Promise<void> => {
  const { name, description, tokenSymbol, apr, minStake, maxStake, durationDays, projectName, createdByWallet } = req.body;

  if (!name || !description || !tokenSymbol || !createdByWallet) {
    res.status(400).json({ error: "name, description, tokenSymbol, createdByWallet are required" });
    return;
  }

  const [pool] = await db
    .insert(stakingPoolsTable)
    .values({
      name,
      description,
      tokenSymbol,
      apr: apr ?? 0,
      minStake: minStake ?? 0,
      maxStake,
      durationDays,
      projectName,
      createdByWallet,
      status: "active",
    })
    .returning();

  res.status(201).json(pool);
});

router.get("/staking/pools/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [pool] = await db.select().from(stakingPoolsTable).where(eq(stakingPoolsTable.id, id));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }

  res.json(pool);
});

router.post("/staking/stake", async (req, res): Promise<void> => {
  const { walletAddress, poolId, amount } = req.body;
  if (!walletAddress || !poolId || amount == null) {
    res.status(400).json({ error: "walletAddress, poolId, amount are required" });
    return;
  }

  const [pool] = await db.select().from(stakingPoolsTable).where(eq(stakingPoolsTable.id, poolId));
  if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }

  const [position] = await db
    .insert(stakePositionsTable)
    .values({ poolId, walletAddress, amount })
    .returning();

  await db
    .update(stakingPoolsTable)
    .set({ totalStaked: pool.totalStaked + amount, totalStakers: pool.totalStakers + 1 })
    .where(eq(stakingPoolsTable.id, poolId));

  await db.insert(activityTable).values({
    type: "staked",
    walletAddress,
    description: `Staked ${amount} ${pool.tokenSymbol} in ${pool.name}`,
    points: null,
  });

  const fullPosition = { ...position, pool };
  res.json(fullPosition);
});

router.get("/staking/positions/:walletAddress", async (req, res): Promise<void> => {
  const { walletAddress } = req.params;
  const walletAddr = walletAddress as string;

  const positions = await db.select().from(stakePositionsTable).where(eq(stakePositionsTable.walletAddress, walletAddr));

  const withPools = await Promise.all(
    positions.map(async (pos) => {
      const [pool] = await db.select().from(stakingPoolsTable).where(eq(stakingPoolsTable.id, pos.poolId));
      return { ...pos, pool };
    })
  );

  res.json(withPools);
});

export default router;
