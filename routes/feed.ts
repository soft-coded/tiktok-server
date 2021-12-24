import { Router } from "express";
import { body, query } from "express-validator";

import {
	getFeed,
	getFollowingVids,
	getSuggested,
	search
} from "../controllers/feed";
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
		query("skip")
			.optional()
			.trim()
			.toInt()
			.exists({ checkFalsy: true })
			.withMessage("Invalid skip value"),
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
		query("skip")
			.optional()
			.trim()
			.toInt()
			.exists({ checkFalsy: true })
			.withMessage("Invalid skip value"),
		valRes,
		getFollowingVids
	);

router.route("/search").post(
	body("query")
		.trim()
		.exists({ checkFalsy: true })
		.withMessage("Search query is required"),
	body("send")
		.trim()
		.exists({ checkFalsy: true })
		.withMessage("'Send' property is required")
		.custom(val => val === "accounts" || val === "videos")
		.withMessage("Invalid 'send' property value"),
	valRes,
	search
);

export default router;
