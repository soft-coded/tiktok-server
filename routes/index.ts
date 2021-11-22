import { Router } from "express";

import authRouter from "./auth";

const router = Router();

router.get("/", (_, res) => {
  res.status(200).send("Connected");
});

router.use("/auth", authRouter);

export default router;
