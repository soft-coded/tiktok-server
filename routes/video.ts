import { Router } from "express";
import { body, param } from "express-validator";

import {
	createVideo,
	getVideo,
	deleteVideo,
	likeOrUnlike,
	comment,
	deleteComment,
	reply,
	deleteReply
} from "../controllers/video";
import { uploadVideo } from "../utils/multer";
import {
	isValidUser,
	isValidVideo,
	isValidComment,
	valRes
} from "../controllers/validation";

const router = Router();

router
	.route("/create")
	.post(
		uploadVideo.single("video"),
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
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		valRes,
		deleteComment
	);

router
	.route("/reply")
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
		body("commentId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		body("comment")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Reply cannot be empty.")
			.isLength({ max: 400 })
			.withMessage("Reply cannot be more than 400 characters."),
		valRes,
		reply
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
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		body("replyId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("ReplyId cannot be empty."),
		valRes,
		deleteReply
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
