import { Router } from "express";

import authRouter from "./auth";
import userRouter from "./user";

const router = Router();

router.get("/", (_, res) => {
  res.status(200).send("Connected");
});

router.use("/auth", authRouter);
router.use("/user", userRouter);

export default router;
