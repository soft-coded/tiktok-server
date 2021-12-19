import { Router } from "express";
import { query } from "express-validator";

import { getFeed, getFollowingVids, getSuggested } from "../controllers/feed";
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

router
	.route("/following")
	.get(
		query("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Username is required")
			.bail()
			.custom(isValidUser),
		valRes,
		getFollowingVids
	);

export default router;
