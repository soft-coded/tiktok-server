import { Router } from "express";
import { body } from "express-validator";

import { login, signup } from "../controllers/auth";
import { valRes, isValidUser } from "../controllers/validation";

const router = Router();

router
	.route("/login")
	.post(
		body("username")
			.trim()
			.isLength({ max: 15 })
			.withMessage("Username too long.")
			.isLength({ min: 4 })
			.withMessage("Username too short.")
			.bail()
			.custom(isValidUser),
		body("password")
			.trim()
			.isLength({ min: 6 })
			.withMessage("Password too short."),
		valRes,
		login
	);

router.route("/signup").post(
	body("username")
		.trim()
		.isLength({ max: 15 })
		.withMessage("Username too long.")
		.isLength({ min: 4 })
		.withMessage("Username too short."),
	body("email")
		.trim()
		.isEmail()
		.withMessage("Invalid email.")
		.normalizeEmail({ all_lowercase: true }),
	body("name")
		.trim()
		.exists({ checkFalsy: true, checkNull: true })
		.withMessage("Name is required."),
	body("password")
		.trim()
		.isLength({ min: 6 })
		.withMessage("Password too short."),
	body("confpass")
		.trim()
		.custom((value, { req }) => value === req.body.password)
		.withMessage("Passwords do not match."),
	valRes,
	signup
);

export default router;
