import { Router } from "express";

import { getUserData } from "../controllers/user";

const router = Router();

router.route("/").get(getUserData);

export default router;
