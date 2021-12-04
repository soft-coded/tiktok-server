import { Router } from "express";
import { body, param, header } from "express-validator";

import {
	createVideo,
	getVideo,
	updateVideo,
	deleteVideo,
	likeOrUnlike,
	comment,
	deleteComment,
	likeOrUnlikeComment,
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
import constants from "../utils/constants";

const router = Router();

router
	.route("/create")
	.post(
		uploadVideo.single("video"),
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("caption")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Caption is required.")
			.isLength({ max: constants.captionMaxLen })
			.withMessage("Caption too long."),
		body("tags")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("At least 1 tag is required.")
			.isLength({ max: constants.tagsMaxLen })
			.withMessage("Too many tags."),
		body("music")
			.optional()
			.trim()
			.isLength({ max: constants.musicMaxLen })
			.withMessage("Music credit too long."),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		createVideo
	);

router
	.route("/stream/:videoId")
	.get(
		header("range")
			.exists({ checkFalsy: true })
			.withMessage("Range header required."),
		param("videoId")
			.trim()
			.exists({ checkFalsy: true })
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
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
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
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("comment")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Comment cannot be empty.")
			.isLength({ max: 400 })
			.withMessage("Comment cannot be more than 400 characters."),
		valRes,
		comment
	)
	.delete(
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required."),
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("commentId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		valRes,
		verifyToken,
		deleteComment
	);

router
	.route("/likeComment")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("commentId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		valRes,
		likeOrUnlikeComment
	);

router
	.route("/reply")
	.post(
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("commentId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		body("comment")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Reply cannot be empty.")
			.isLength({ max: 400 })
			.withMessage("Reply cannot be more than 400 characters."),
		valRes,
		reply
	)
	.delete(
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required."),
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("videoId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Video does not exist.")
			.bail()
			.custom(isValidVideo),
		body("commentId")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("CommentId cannot be empty.")
			.bail()
			.custom(isValidComment),
		body("replyId")
			.trim()
			.exists({ checkFalsy: true })
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
			.exists({ checkFalsy: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidVideo),
		valRes,
		getVideo
	)
	.patch(
		param("id")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidVideo),
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required."),
		body("caption")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Caption cannot be empty.")
			.isLength({ max: constants.captionMaxLen })
			.withMessage("Caption too long."),
		body("tags")
			.optional()
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("At least 1 tag is required.")
			.isLength({ max: constants.tagsMaxLen })
			.withMessage("Too many tags."),
		body("music")
			.optional()
			.trim()
			.isLength({ max: constants.musicMaxLen })
			.withMessage("Music credit too long."),
		valRes,
		verifyToken,
		updateVideo
	)
	.delete(
		param("id")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Invalid URL.")
			.bail()
			.custom(isValidVideo),
		body("username")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Log in to continue.")
			.bail()
			.custom(isValidUser),
		body("token")
			.trim()
			.exists({ checkFalsy: true })
			.withMessage("Token is required."),
		valRes,
		verifyToken,
		deleteVideo
	);

export default router;
