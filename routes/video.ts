import { Router } from "express";
import { body, param } from "express-validator";

import {
	createVideo,
	getVideo,
	deleteVideo,
	likeOrUnlike,
	comment,
	deleteComment
} from "../controllers/video";
import upload from "../configs/multer";
import { isValidUser, isValidVideo, valRes } from "../controllers/validation";

const router = Router();

router
	.route("/create")
	.post(
		upload.single("video"),
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		valRes,
		createVideo
	);

router
	.route("/like")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		valRes,
		likeOrUnlike
	);

router
	.route("/comment")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("comment")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Comment cannot be empty.")
			.isLength({ max: 400 })
			.withMessage("Comment cannot be more than 400 characters."),
		valRes,
		comment
	)
	.delete(
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("commentId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("CommentId cannot be empty."),
		valRes,
		deleteComment
	);

// route to a single video, keep below everything else
router
	.route("/:id")
	.get(
		param("id")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidVideo),
		valRes,
		getVideo
	)
	.delete(
		param("id")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidVideo),
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		valRes,
		deleteVideo
	);

export default router;
