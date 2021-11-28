import { Router } from "express";
import { body, param } from "express-validator";

import {
	getUser,
	updateUser,
	updatePfp,
	deletePfp,
	changePassword,
	getPfp
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
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		valRes,
		getPfp
	)
	.post(
		uploadPhoto.single("profilePhoto"),
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		updatePfp
	)
	.delete(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		deletePfp
	);

router
	.route("/changePassword")
	.post(
		body("oldPassword")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Old password is required."),
		body("newPassword")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("New password cannot be empty.")
			.isLength({ min: constants.passwordMinLen })
			.withMessage("New password too short."),
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		changePassword
	);

router
	.route("/:username")
	.get(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidUser),
		valRes,
		getUser
	)
	.patch(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidUser),
		body("name")
			.optional()
			.trim()
			.isLength({ min: 1 })
			.withMessage("Name cannot be empty.")
			.isLength({ max: constants.nameMaxLen })
			.withMessage("Name too long."),
		body("email")
			.optional()
			.trim()
			.isEmail()
			.withMessage("Invalid email.")
			.normalizeEmail({ all_lowercase: true }),
		body("description")
			.optional()
			.trim()
			.isLength({ min: 1 })
			.withMessage("Bio cannot be empty.")
			.isLength({ max: constants.descriptionMaxLen })
			.withMessage("Bio too long."),
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		updateUser
	);

export default router;
