import { Router } from "express";
import { param } from "express-validator";

import { getUserData } from "../controllers/user";
import { valRes, isValidUser } from "../controllers/validation";

const router = Router();

router
	.route("/:username")
	.get(
		param("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.custom(isValidUser),
		valRes,
		getUserData
	);

export default router;
