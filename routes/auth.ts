import { Router } from "express";
import { body } from "express-validator";

import { login, signup } from "../controllers/auth";
import { valRes, isValidUser } from "../controllers/validation";
import constants from "../utils/constants";

const router = Router();

router
	.route("/login")
	.post(
		body("username")
			.trim()
			.isLength({ max: constants.usernameMaxLen })
			.withMessage("Username too long")
			.isLength({ min: constants.usernameMinLen })
			.withMessage("Username too short")
			.bail()
			.custom(isValidUser),
		body("password")
			.trim()
			.isLength({ min: constants.passwordMinLen })
			.withMessage("Password too short"),
		valRes,
		login
	);

router.route("/signup").post(
	body("username")
		.trim()
		.isLength({ max: constants.usernameMaxLen })
		.withMessage("Username too long")
		.isLength({ min: constants.usernameMinLen })
		.withMessage("Username too short")
		.custom(val => constants.usernameRegex.test(val))
		.withMessage(
			"Username can only contain English letters, digits and underscores"
		),
	body("email")
		.trim()
		.isEmail()
		.withMessage("Invalid email")
		.normalizeEmail({ all_lowercase: true }),
	body("name")
		.trim()
		.exists({ checkFalsy: true })
		.withMessage("Name is required")
		.isLength({ max: constants.nameMaxLen })
		.withMessage("Name too long"),
	body("password")
		.trim()
		.isLength({ min: constants.passwordMinLen })
		.withMessage("Password too short"),
	body("confpass")
		.trim()
		.custom((value, { req }) => value === req.body.password)
		.withMessage("Passwords do not match"),
	valRes,
	signup
);

export default router;
