import asyncHandler from "express-async-handler";
import { statSync, createReadStream } from "fs";

import { CustomError } from "../utils/error";
import { successRes } from "../utils/success";
import { removeFile, getRelativePath } from "../utils/fileHander";
import VideoModel, { ExtendedVideo } from "../models/video";
import UserModel from "../models/user";
import constants from "../utils/constants";

/*
A single video object will look like this:
{
	_id: "...",
	uploader: userId,
	video: fileName,
	caption: "...",
	music: "...",
	tags: ["...", ...],
	comments: [
		{
			_id: "...",
			postedBy: userId,
			comment: "...",
			createdAt: Date,
			likes: [userId, ...],
			replies: [
				{
					_id: "...",
					postedBy: userId,
					comment: "...",
					createdAt: Date,
					likes: [userId, ...]
				},
				...
			]
		},
		...
	],
	shares: Num,
	views: Num,
	createdAt: Date
}
*/

export const createVideo = asyncHandler(async (req, res) => {
	if (!req.file) throw new CustomError(500, "Video upload unsuccessful");

	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	))!;

	let { caption, music, tags } = req.body;
	if (!music) music = req.body.username + " - Original audio";
	tags = tags.split(" ");

	const video = await VideoModel.create({
		uploader: user._id,
		video: req.file.filename,
		caption: caption,
		music: music,
		tags: tags
	});

	// add video to user's uploaded array and update the interestedIn array
	UserModel.findByIdAndUpdate(user._id, {
		$push: { "videos.uploaded": video._id, interestedIn: { $each: tags } }
	}).exec(); // !! exec() is important !!

	res.status(201).json(successRes({ videoId: video._id }));
});

type Query = {
	username?: string;
	uploader?: "1";
	caption?: "1";
	music?: "1";
	tags?: "1";
	shares?: "1";
	views?: "1";
	createdAt?: "1";
	likes?: "1";
	comments?: "num" | "list";
};

async function getNum(field: string, videoId: string) {
	const vidData: ExtendedVideo = await VideoModel.findById(videoId, {
		num: { $size: "$" + field },
		_id: 0
	}).lean();

	return vidData.num;
}

export async function hasLiked(videoId: string, username: string) {
	const user = await UserModel.findOne({ username }, "_id");
	return await VideoModel.exists({ _id: videoId, likes: user!._id });
}

export async function hasLikedComment(
	videoId: string,
	commentId: string,
	username: string
) {
	const user = await UserModel.findOne({ username }, "_id").lean();

	return await VideoModel.exists({
		_id: videoId,
		comments: { $elemMatch: { _id: commentId, likes: user!._id } }
	});
}

export const getVideo = asyncHandler(async (req, res) => {
	const query: Query = req.query;
	let projection = "-__v -uploader -likes -comments -video";

	if (query.caption !== "1") projection += " -caption";
	if (query.music !== "1") projection += " -music";
	if (query.views !== "1") projection += " -views";
	if (query.shares !== "1") projection += " -shares";
	if (query.tags !== "1") projection += " -tags";
	if (query.createdAt !== "1") projection += " -createdAt";

	const video: ExtendedVideo = await VideoModel.findById(
		req.params.id,
		projection
	).lean();
	video.videoId = video._id;
	delete video._id;

	if (query.uploader === "1") {
		const vidData = await VideoModel.findById(req.params.id, "uploader -_id")
			.populate("uploader", "username name -_id")
			.lean();

		video.uploader = vidData!.uploader;
	}

	if (query.likes === "1") video.likes = await getNum("likes", req.params.id);

	if (query.comments === "num")
		video.comments = await getNum("comments", req.params.id);
	else if (query.comments === "list") {
		const vidData = (await VideoModel.findById(req.params.id, {
			_id: 0,
			comments: {
				$map: {
					input: "$comments",
					as: "comm",
					in: {
						commentId: "$$comm._id",
						postedBy: "$$comm.postedBy",
						comment: "$$comm.comment",
						createdAt: "$$comm.createdAt",
						likes: { $size: "$$comm.likes" }
					}
				}
			}
		})
			.populate("comments.postedBy", "username name -_id")
			.lean())!;
		// whether the user liked the comment or not
		if (query.username) {
			for (let comm of vidData.comments) {
				comm.hasLiked = await hasLikedComment(
					video.videoId!,
					comm.commentId!,
					query.username
				);
			}
		}
		video.comments = vidData.comments;
	}

	if (query.username)
		video.hasLiked = await hasLiked(video.videoId!, query.username);

	// increment the number of views on the video
	VideoModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).catch(
		err => console.error(err)
	);

	res.status(200).json(successRes(video));
});

export const updateVideo = asyncHandler(async (req, res) => {
	const video = (await VideoModel.findById(
		req.params.id,
		"caption music tags"
	))!;

	const { caption, music, tags } = req.body;
	if (caption) video.caption = caption;
	if (music) video.music = music;
	if (tags) video.tags = tags.split(" ");

	await video.save();
	res.status(200).json(successRes({ videoId: video._id }));
});

export const deleteVideo = asyncHandler(async (req, res) => {
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	))!;
	const video = (await VideoModel.findById(
		req.params.id,
		"uploader video likes"
	))!;
	if (!user._id.equals(video.uploader))
		throw new CustomError(403, "You are not allowed to perform this action");

	// file deletion and removal doesn't need to be synchronous
	removeFile(video.video, constants.videosFolder);
	UserModel.findByIdAndUpdate(user._id, {
		$pull: { "videos.uploaded": video._id },
		$inc: { totalLikes: -video.likes.length } // decrement the totalLikes of the uploader
	}).exec(); // !!! does not work without calling exec() !!!

	// need to remove for whoever liked it as well
	UserModel.updateMany(
		{ "videos.liked": video._id },
		{ $pull: { "videos.liked": video._id } }
	).exec(); // !!! does not work without calling exec() !!!

	await VideoModel.findByIdAndDelete(video._id);
	res.status(202).json(successRes());
});

export const likeOrUnlike = asyncHandler(async (req, res) => {
	const liker = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	).lean())!;

	let video = await VideoModel.findOne(
		{ _id: req.body.videoId, likes: liker._id as any },
		"likes uploader"
	).lean();

	let liked = true; // if the video was liked or unliked, used in response

	if (video) {
		liked = false;

		// update asynchronously
		VideoModel.findByIdAndUpdate(video._id, {
			$pull: { likes: liker._id }
		})
			.exec()
			.catch(err => console.error(err.message)); // !! exec() is important !!

		// update total likes of the uploader
		UserModel.findByIdAndUpdate(video.uploader, {
			$inc: { totalLikes: -1 }
		})
			.exec()
			.catch(err => console.error(err.message));

		// update "liked videos" array of liker
		UserModel.findByIdAndUpdate(liker._id, {
			$pull: { "videos.liked": video._id }
		})
			.exec()
			.catch(err => console.error(err.message));
	} else {
		video = (await VideoModel.findById(req.body.videoId, "uploader"))!;

		VideoModel.findByIdAndUpdate(video._id, {
			$push: { likes: liker._id }
		})
			.exec()
			.catch(err => console.error(err.message)); // !! exec() is important !!

		UserModel.findByIdAndUpdate(video.uploader, {
			$inc: { totalLikes: 1 }
		})
			.exec()
			.catch(err => console.error(err.message));

		UserModel.findByIdAndUpdate(liker._id, {
			$push: { "videos.liked": video._id }
		})
			.exec()
			.catch(err => console.error(err.message));
	}

	res.status(202).json(successRes({ liked }));
});

export const comment = asyncHandler(async (req, res) => {
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	))!;
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments._id"
	))!;

	const comment = video.comments.create({
		postedBy: user._id,
		comment: req.body.comment
	});
	video.comments.push(comment);
	await video.save();

	res.status(201).json(successRes({ commentId: comment._id }));
});

export const deleteComment = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne({ username: req.body.username }, "_id");
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments._id comments.postedBy"
	))!;
	const comment = video.comments.id(req.body.commentId);

	if (!comment.postedBy.equals(user!._id))
		throw new CustomError(403, "You are not allowed to perform this action");

	comment.remove();
	await video.save();

	res.status(200).json(successRes());
});

export const likeOrUnlikeComment = asyncHandler(async (req, res) => {
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	).lean())!;

	let video = (await VideoModel.findOne(
		{
			_id: req.body.videoId,
			comments: { $elemMatch: { _id: req.body.commentId, likes: user._id } }
		},
		"comments._id comments.likes comments.postedBy"
	))!;

	let liked = true; // if the comment was liked or unliked

	if (video) {
		liked = false;
		// remove the like from the comment
		VideoModel.findByIdAndUpdate(
			req.body.videoId,
			{ $pull: { "comments.$[elem].likes": user._id } },
			{ arrayFilters: [{ "elem._id": req.body.commentId }] }
		)
			.exec()
			.catch(err => console.error(err.message));

		// decrement totalLikes of the comment poster
		UserModel.findByIdAndUpdate(video.comments[0].postedBy, {
			$inc: { totalLikes: -1 }
		})
			.exec()
			.catch(err => console.error(err.message));
	} else {
		video = (await VideoModel.findOne(
			{
				_id: req.body.videoId,
				"comments._id": req.body.commentId
			},
			"comments.$"
		))!;

		// like the comment
		VideoModel.findByIdAndUpdate(
			video._id,
			{ $push: { "comments.$[elem].likes": user._id } },
			{ arrayFilters: [{ "elem._id": req.body.commentId }] }
		)
			.exec()
			.catch(err => console.error(err.message));

		// increment the totalLikes of the comment poster
		UserModel.findByIdAndUpdate(video.comments[0].postedBy, {
			$inc: { totalLikes: 1 }
		})
			.exec()
			.catch(err => console.error(err.message));
	}

	res.status(202).json(successRes({ liked }));
});

export const reply = asyncHandler(async (req, res) => {
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	))!;
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments.replies comments._id"
	))!;
	const replies = video.comments.id(req.body.commentId).replies;

	const reply = replies.create({
		postedBy: user._id,
		comment: req.body.comment
	});
	replies.push(reply);
	await video.save();

	res.status(201).json(successRes({ replyId: reply._id }));
});

export const deleteReply = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne({ username: req.body.username }, "_id");
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments.replies._id comments.replies.postedBy comments._id"
	))!;

	const reply = video.comments
		.id(req.body.commentId)
		.replies.id(req.body.replyId);

	if (!reply) throw new CustomError(404, "Reply does not exist");
	if (!reply.postedBy.equals(user!._id))
		throw new CustomError(403, "You are not allowed to perform this action");

	reply.remove();
	await video.save();

	res.status(200).json(successRes());
});

const chunkSize = 1048576; // 1MB
export const streamVideo = asyncHandler(async (req, res) => {
	const video = (await VideoModel.findById(
		req.params.videoId,
		"video -_id"
	).lean())!;
	const path = getRelativePath(constants.videosFolder, video.video);
	const range = req.headers.range!;

	const videoSize = statSync(path).size;
	// range looks like: "bytes=32123-"
	const start = Number(range.replace(/\D/g, "")); // get rid of all non digit characters
	const end = Math.min(start + chunkSize, videoSize - 1);

	// response headers
	res.writeHead(206, {
		"Content-Range": `bytes ${start}-${end}/${videoSize}`,
		"Accept-Ranges": "bytes",
		"Content-Length": end - start + 1,
		"Content-Type": "video/mp4"
	});

	const videoStream = createReadStream(path, {
		start,
		end,
		highWaterMark: chunkSize
	});
	videoStream.pipe(res);
});
