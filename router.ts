import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.send("bruh moment");
});

export default router;
