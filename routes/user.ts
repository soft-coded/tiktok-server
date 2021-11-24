import { Router } from "express";

import { getUserData } from "../controllers/user";

const router = Router();

router.route("/:username").get(getUserData);

export default router;
