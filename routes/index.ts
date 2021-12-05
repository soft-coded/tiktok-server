import { Router } from "express";

import authRouter from "./auth";
import userRouter from "./user";
import videoRouter from "./video";
import feedRouter from "./feed";

const router = Router();

router.get("/", (_, res) => {
	res.status(200).send("Connected");
});

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/video", videoRouter);
router.use("/feed", feedRouter);

export default router;
