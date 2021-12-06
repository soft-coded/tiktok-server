import { Router } from "express";
import { query } from "express-validator";

import { getFeed } from "../controllers/feed";
import { isValidUser, valRes } from "../controllers/validation";

const router = Router();

router
	.route("/")
	.get(
		query("username")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Username cannot be empty")
			.bail()
			.custom(isValidUser),
		valRes,
		getFeed
	);

export default router;
