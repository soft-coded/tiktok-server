import { Router } from "express";
import { body, param } from "express-validator";

import { getUser, updateUser, updatePfp, deletePfp } from "../controllers/user";
import { valRes, isValidUser } from "../controllers/validation";
import { uploadPhoto } from "../utils/multer";

const router = Router();

router
	.route("/profilePhoto")
	.post(
		uploadPhoto.single("profilePhoto"),
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.custom(isValidUser),
		valRes,
		updatePfp
	)
	.delete(
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.custom(isValidUser),
		valRes,
		deletePfp
	);

router
	.route("/:username")
	.get(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.custom(isValidUser),
		valRes,
		getUser
	)
	.patch(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.custom(isValidUser),
		body("name")
			.optional()
			.trim()
			.isLength({ min: 1 })
			.withMessage("Name cannot be empty.")
			.isLength({ max: 30 })
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
			.isLength({ max: 300 })
			.withMessage("Bio too long."),
		valRes,
		updateUser
	);

export default router;
