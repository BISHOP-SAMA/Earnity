import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import questsRouter from "./quests";
import rafflesRouter from "./raffles";
import auctionsRouter from "./auctions";
import stakingRouter from "./staking";
import activityRouter from "./activity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(questsRouter);
router.use(rafflesRouter);
router.use(auctionsRouter);
router.use(stakingRouter);
router.use(activityRouter);

export default router;
