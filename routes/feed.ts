import { Router } from "express";
import { query } from "express-validator";

import { getFeed, getSuggested } from "../controllers/feed";
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

router.route("/suggested").get(
	query("limit")
		.optional()
		.trim()
		.toInt()
		.exists({ checkFalsy: true })
		.withMessage("Invalid limit")
		.custom(val => val >= 0)
		.withMessage("Limit cannot be negative"),
	valRes,
	getSuggested
);

export default router;
