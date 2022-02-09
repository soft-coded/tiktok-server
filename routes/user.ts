import { Router } from "express";
import { body, param, query } from "express-validator";

import {
	getUser,
	updateUser,
	getPfp,
	followOrUnfollow,
	readAllNotifs,
	delOneNotif,
	hasNewNotifs
} from "../controllers/user";
import { valRes, isValidUser, verifyToken } from "../controllers/validation";
import { uploadPhoto } from "../utils/multer";
import constants from "../utils/constants";

const router = Router();

router
	.route("/profilePhoto/:username")
	.get(
		param("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue")
			.bail()
			.custom(isValidUser),
		valRes,
		getPfp
	);

router.route("/follow").post(
	body("token").exists({ checkFalsy: true }).withMessage("Token is required"),
	body("toFollow")
		.trim()
		.exists({ checkFalsy: true })
		.withMessage("To-follow username is required")
		.bail()
		.custom(isValidUser),
	body("loggedInAs")
		.trim()
		.exists({ checkFalsy: true })
		.withMessage("Log in to continue")
		.bail()
		.custom(isValidUser)
		.custom((val, { req }) => val !== req.body.toFollow)
		.withMessage("You cannot follow yourself"),
	valRes,
	verifyToken,
	followOrUnfollow
);

const notifRoute = "/notifications";

router
	.route(notifRoute)
	.delete(
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Username is required")
			.bail()
			.custom(isValidUser),
		body("notificationId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("NotificationId is required"),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required"),
		valRes,
		verifyToken,
		delOneNotif
	);

router
	.route(notifRoute + "/hasNew")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Username is required")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required"),
		valRes,
		verifyToken,
		hasNewNotifs
	);

router
	.route(notifRoute + "/readAll")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Username is required")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required"),
		valRes,
		verifyToken,
		readAllNotifs
	);

router
	.route("/:username")
	.get(
		param("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Invalid URL")
			.bail()
			.custom(isValidUser),
		query("loggedInAs")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Logged in as invalid user")
			.custom(isValidUser),
		valRes,
		getUser
	)
	.patch(
		uploadPhoto.single("profilePhoto"),
		param("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Invalid URL")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required"),
		body("oldPassword")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Old password is required"),
		body("newPassword")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("New password cannot be empty")
			.isLength({ min: constants.passwordMinLen })
			.withMessage("New password too short"),
		body("name")
			.optional()
			.trim()
			.isLength({ min: 1 })
			.withMessage("Name cannot be empty")
			.isLength({ max: constants.nameMaxLen })
			.withMessage("Name too long"),
		body("email")
			.optional()
			.trim()
			.isEmail()
			.withMessage("Invalid email")
			.normalizeEmail({ all_lowercase: true }),
		body("description")
			.optional()
			.trim()
			.isLength({ min: 1 })
			.withMessage("Bio cannot be empty")
			.isLength({ max: constants.descriptionMaxLen })
			.withMessage("Bio too long"),
		valRes,
		verifyToken,
		updateUser
	);

export default router;
