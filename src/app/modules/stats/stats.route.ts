import { Router } from "express";
import { StatsController } from "./stats.controller";

const router = Router()

router.get("/monthly/user_driver", StatsController.getMonthlyStats)
router.get("/weekly/user", StatsController.getWeeklyUsersStats)

export const StatsRoutes = router