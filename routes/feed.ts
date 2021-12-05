import { Router } from "express";

import { getFeed } from "../controllers/feed";

const router = Router();

router.route("/").get(getFeed);

export default router;
