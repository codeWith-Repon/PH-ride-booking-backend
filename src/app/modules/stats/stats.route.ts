import { Router } from "express";
import { StatsController } from "./stats.controller";

const router = Router()

router.get("/monthly/user_driver", StatsController.getMonthlyStats)
router.get("/monthly/user", StatsController.getWeeklyTotalUserStats)

export const StatsRoutes = router