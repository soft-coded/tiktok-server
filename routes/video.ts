import { Router } from "express";
import { body, param, header } from "express-validator";

import {
	createVideo,
	getVideo,
	deleteVideo,
	likeOrUnlike,
	comment,
	deleteComment,
	reply,
	deleteReply,
	streamVideo
} from "../controllers/video";
import { uploadVideo } from "../utils/multer";
import {
	isValidUser,
	isValidVideo,
	isValidComment,
	valRes,
	verifyToken
} from "../controllers/validation";

const router = Router();

router
	.route("/create")
	.post(
		uploadVideo.single("video"),
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		body("username")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		valRes,
		verifyToken,
		createVideo
	);

router
	.route("/stream/:videoId")
	.get(
		header("range")
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Range header required."),
		param("videoId")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("VideoId is required.")
			.bail()
			.custom(isValidVideo),
		valRes,
		streamVideo
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
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
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
		verifyToken,
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
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
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
		verifyToken,
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
		body("token")
			.trim()
			.exists({ checkFalsy: true, checkNull: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		deleteVideo
	);

export default router;
