import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shelfRouter from "./shelf";

const router: IRouter = Router();

router.use(healthRouter);
router.use(shelfRouter);

export default router;
