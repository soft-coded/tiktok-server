import asyncHandler from "express-async-handler";
import { statSync, createReadStream } from "fs";
import { Server, Socket } from "socket.io";
import { run as runHandbrake, spawn as spawnHandbrake } from "handbrake-js";

import { CustomError } from "../utils/error";
import { successRes } from "../utils/success";
import { removeFile, getRelativePath } from "../utils/fileHander";
import VideoModel, { ExtendedVideo } from "../models/video";
import UserModel from "../models/user";
import constants from "../utils/constants";
import { isFollowing, createNotification, deleteNotification } from "./user";

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

	res.json(successRes({ filename: req.file.filename }));
});

interface UploadData {
	filename: string;
	username: string;
	caption: string;
	music?: string;
	tags: string;
}

export function compressVideo(data: UploadData, socket: Socket) {
	let isDone = false;
	const process = spawnHandbrake({
		input: getRelativePath(constants.tempFolder, data.filename),
		output: getRelativePath(constants.videosFolder, data.filename),
		optimize: true,
		encoder: "x264",
		quality: 28,
		aencoder: "av_aac"
	})
		.on("progress", progress => {
			socket.emit("compressionProgress", {
				percent: progress.percentComplete,
				eta: progress.eta
			});
		})
		.on("complete", async () => {
			isDone = true;
			const user = (await UserModel.findOne(
				{ username: data.username },
				"_id"
			).lean())!;

			let { caption, music, tags } = data;
			if (!music) music = data.username + " - original audio";
			// split the "tags" string into array, remove all the hashtags from each string and then remove all the empty strings
			const tagsArr = tags
				.split(" ")
				.map(tag => tag.replace(/#/g, "").trim())
				.filter(tag => tag);

			const video = await VideoModel.create({
				uploader: user._id,
				video: data.filename,
				caption,
				music,
				tags: tagsArr
			});
			// res.status(201).json(successRes({ videoId: video._id }));
			socket.emit("compressionComplete", { videoId: video._id });

			// remove the uncompressed file
			removeFile(data.filename, constants.tempFolder);

			// add video to user's uploaded array and update the interestedIn array
			UserModel.findByIdAndUpdate(user._id, {
				$push: {
					"videos.uploaded": video._id
					// interestedIn: { $each: tagsArr }
				}
			})
				.exec() // !! exec() is important !!
				.catch(err => console.error(err));
		})
		.on("cancelled", () => {
			// doing this without a delay causes an error and the files aren't deleted
			setTimeout(() => {
				removeFile(data.filename, constants.tempFolder);
				removeFile(data.filename, constants.videosFolder);
			}, 1000);
		})
		.on("error", err => {
			socket.emit("compressionError", err);
			setTimeout(() => {
				removeFile(data.filename, constants.tempFolder);
				removeFile(data.filename, constants.videosFolder);
			}, 1000);
		});

	function cancel() {
		if (isDone) return;
		process.cancel();
	}

	socket.on("cancelCompression", cancel);
	socket.on("disconnect", cancel);
}

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
	const user = await UserModel.findOne({ username }, "_id").lean();
	return await VideoModel.exists({ _id: videoId, likes: user!._id as any });
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
	let projection = "-__v -uploader -likes -comments -video -totalComments";

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
		video.comments = (await VideoModel.findById(
			req.params.id,
			"totalComments -_id"
		).lean())!.totalComments;
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
						likes: { $size: "$$comm.likes" },
						replies: { $size: "$$comm.replies" }
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
		video.comments = vidData.comments.reverse();
	}

	if (query.username) {
		video.hasLiked = await hasLiked(video.videoId!, query.username);
		video.isFollowing = await isFollowing(
			query.username,
			video.uploader?.username ||
				(await VideoModel.findById(req.params.id, "uploader -_id")
					.populate("uploader", "username -_id")
					.lean())!.uploader.username
		);
	}

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
		$pull: { "videos.uploaded": video._id }
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
			.catch(err => console.error(err)); // !! exec() is important !!

		// update total likes of the uploader
		UserModel.findByIdAndUpdate(video.uploader, {
			$inc: { totalLikes: -1 }
		})
			.exec()
			.catch(err => console.error(err));

		// update "liked videos" array of liker
		UserModel.findByIdAndUpdate(liker._id, {
			$pull: { "videos.liked": video._id }
		})
			.exec()
			.catch(err => console.error(err));

		// delete the notification
		deleteNotification("ref", video.uploader as any, {
			type: "likedVideo",
			refId: video._id,
			by: liker._id
		}).catch(err => console.error(err));
	} else {
		video = (await VideoModel.findById(req.body.videoId, "uploader"))!;

		VideoModel.findByIdAndUpdate(video._id, {
			$push: { likes: liker._id }
		})
			.exec()
			.catch(err => console.error(err)); // !! exec() is important !!

		UserModel.findByIdAndUpdate(video.uploader, {
			$inc: { totalLikes: 1 }
		})
			.exec()
			.catch(err => console.error(err));

		UserModel.findByIdAndUpdate(liker._id, {
			$push: { "videos.liked": video._id }
		})
			.exec()
			.catch(err => console.error(err));

		// notify the uploader
		createNotification(video.uploader as any, {
			type: "likedVideo",
			message: "liked your video.",
			refId: video._id,
			by: liker._id
		}).catch(err => console.error(err));
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
		"comments._id uploader"
	))!;

	const comment = video.comments.create({
		postedBy: user._id,
		comment: req.body.comment
	});
	video.comments.push(comment);
	await video.save();

	res.status(201).json(successRes({ commentId: comment._id }));
	// increment the total comments on the video
	VideoModel.findByIdAndUpdate(req.body.videoId, {
		$inc: { totalComments: 1 }
	})
		.exec()
		.catch(err => console.error(err));

	// notify the uploader
	let subComment: string;
	if (req.body.comment.length < 31) subComment = req.body.comment;
	else subComment = req.body.comment.substring(0, 30) + "...";

	createNotification(video.uploader as any, {
		type: "commented",
		message: "commented on your video: " + subComment,
		refId: comment._id,
		by: user._id,
		meta: { videoId: video._id }
	}).catch(err => console.error(err));
});

export const deleteComment = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne({ username: req.body.username }, "_id");
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments._id comments.postedBy comments.replies uploader"
	))!;
	const comment = video.comments.id(req.body.commentId);
	if (!comment.postedBy.equals(user!._id))
		throw new CustomError(403, "You are not allowed to perform this action");

	const repliesNum = comment.replies.length;
	comment.remove();
	await video.save();

	res.status(200).json(successRes());
	// decrement the total comments on the video
	VideoModel.findByIdAndUpdate(req.body.videoId, {
		$inc: { totalComments: -repliesNum - 1 }
	})
		.exec()
		.catch(err => console.error(err));

	// delete the notification
	deleteNotification("ref", video.uploader as any, {
		type: "commented",
		refId: comment._id,
		by: comment.postedBy
	}).catch(err => console.error(err));
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
			.catch(err => console.error(err));

		// decrement totalLikes of the comment poster
		UserModel.findByIdAndUpdate(video.comments[0].postedBy, {
			$inc: { totalLikes: -1 }
		})
			.exec()
			.catch(err => console.error(err));
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
			.catch(err => console.error(err));

		// increment the totalLikes of the comment poster
		UserModel.findByIdAndUpdate(video.comments[0].postedBy, {
			$inc: { totalLikes: 1 }
		})
			.exec()
			.catch(err => console.error(err));
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
		"comments.replies comments.postedBy comments._id uploader"
	))!;

	const comment = video.comments.id(req.body.commentId);
	const replies = comment.replies;

	const reply = replies.create({
		postedBy: user._id,
		comment: req.body.comment
	});
	replies.push(reply);
	await video.save();

	res.status(201).json(successRes({ replyId: reply._id }));
	// increment the total comments on the video
	VideoModel.findByIdAndUpdate(req.body.videoId, {
		$inc: { totalComments: 1 }
	})
		.exec()
		.catch(err => console.error(err));

	// notify the uploader
	let subComment: string;
	if (req.body.comment.length < 31) subComment = req.body.comment;
	else subComment = req.body.comment.substring(0, 30) + "...";

	createNotification(comment.postedBy as any, {
		type: "replied",
		message: "replied to your comment: " + subComment,
		refId: reply._id,
		by: user._id,
		meta: {
			videoId: video._id,
			commentId: req.body.commentId
		}
	}).catch(err => console.error(err));
});

export const deleteReply = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	).lean();
	const video: ExtendedVideo = (await VideoModel.findById(
		req.body.videoId,
		"comments.replies comments._id uploader"
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
	// decrement the total comments on the video
	VideoModel.findByIdAndUpdate(req.body.videoId, {
		$inc: { totalComments: -1 }
	})
		.exec()
		.catch(err => console.error(err));

	// delete the notification
	deleteNotification("ref", video.uploader as any, {
		type: "replied",
		refId: reply._id,
		by: reply.postedBy
	}).catch(err => console.error(err));
});

export const likeOrUnlikeReply = asyncHandler(async (req, res) => {
	const exists = await VideoModel.exists({
		_id: req.body.videoId,
		comments: {
			$elemMatch: { _id: req.body.commentId, "replies._id": req.body.replyId }
		}
	});
	if (!exists) throw new CustomError(400, "Reply does not exist");

	let liked = true; // whether the reply was liked or unliked
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	).lean())!;

	let video: any = await VideoModel.findOne(
		{
			_id: req.body.videoId,
			comments: {
				$elemMatch: {
					_id: req.body.commentId,
					replies: {
						$elemMatch: {
							_id: req.body.replyId,
							likes: user._id
						}
					}
				}
			}
		},
		"comments.$"
	);

	if (video) {
		liked = false;
		const reply: any = video.comments[0].replies.id(req.body.replyId);

		// unlike the reply
		VideoModel.findByIdAndUpdate(
			req.body.videoId,
			{ $pull: { "comments.$[comm].replies.$[rep].likes": user._id } },
			{
				arrayFilters: [
					{ "comm._id": req.body.commentId },
					{ "rep._id": req.body.replyId }
				]
			}
		)
			.exec()
			.catch(err => console.error(err));

		// decrement the total likes of the reply poster
		UserModel.findByIdAndUpdate(reply.postedBy, { $inc: { totalLikes: -1 } })
			.exec()
			.catch(err => console.error(err));
	} else {
		video = (await VideoModel.findOne(
			{
				_id: req.body.videoId,
				comments: {
					$elemMatch: {
						_id: req.body.commentId,
						"replies._id": req.body.replyId
					}
				}
			},
			"comments.$"
		))!;
		const reply: any = video.comments[0].replies.id(req.body.replyId);

		// like the reply
		VideoModel.findByIdAndUpdate(
			req.body.videoId,
			{ $push: { "comments.$[comm].replies.$[rep].likes": user._id } },
			{
				arrayFilters: [
					{ "comm._id": req.body.commentId },
					{ "rep._id": req.body.replyId }
				]
			}
		)
			.exec()
			.catch(err => console.error(err));

		// increment the total likes of the reply poster
		UserModel.findByIdAndUpdate(reply.postedBy, { $inc: { totalLikes: 1 } })
			.exec()
			.catch(err => console.error(err));
	}

	res.status(200).json(successRes({ liked }));
});

export const getReplies = asyncHandler(async (req, res) => {
	const replies = (await VideoModel.findOne(
		{
			_id: req.query.videoId as string,
			"comments._id": req.query.commentId as string
		},
		"comments.$"
	)
		.populate("comments.replies.postedBy", "username name -_id")
		.lean())!.comments[0].replies;

	if (req.query.username) {
		const user = (await UserModel.findOne(
			{ username: req.query.username as string },
			"_id"
		))!;

		replies.forEach(reply => {
			reply.hasLiked =
				(reply.likes as any[]).findIndex(elem => user._id.equals(elem)) !== -1;
		});
	}

	replies.forEach(reply => {
		reply.replyId = reply._id;
		delete reply._id;
		reply.likes = (reply.likes as any[]).length;
	});

	res.status(200).json(successRes({ replies }));
});

export const share = asyncHandler(async (req, res) => {
	VideoModel.findByIdAndUpdate(req.body.videoId, { $inc: { shares: 1 } })
		.exec()
		.catch(err => console.error(err));

	res.status(202).json(successRes());
});

export const streamVideo = asyncHandler(async (req, res) => {
	const video = (await VideoModel.findById(
		req.params.videoId,
		"video -_id"
	).lean())!;
	const filePath = getRelativePath(constants.videosFolder, video.video);

	const options: any = {};
	let start: number | null = null,
		end: number | null = null;

	const range = req.headers.range;
	if (range) {
		const bytesPrefix = "bytes=";
		if (range.startsWith(bytesPrefix)) {
			const bytesRange = range.substring(bytesPrefix.length);
			const parts = bytesRange.split("-");
			if (parts.length === 2) {
				const rangeStart = parts[0] && parts[0].trim();
				if (rangeStart && rangeStart.length > 0)
					options.start = start = +rangeStart;

				const rangeEnd = parts[1] && parts[1].trim();
				if (rangeEnd && rangeEnd.length > 0) options.end = end = +rangeEnd;
			}
		}
	}

	res.setHeader("content-type", "video/mp4");

	const stat = statSync(filePath); // synchronous to automatically catch errors

	const contentLength = stat.size;

	if (/HEAD/i.test(req.method)) {
		res.statusCode = 200;
		res.setHeader("accept-ranges", "bytes");
		res.setHeader("content-length", contentLength);
		res.end();
		return;
	}

	let retrievedLength: number;
	if (start != null && end != null) retrievedLength = end + 1 - start;
	else if (start != null) retrievedLength = contentLength - start;
	else if (end != null) retrievedLength = end + 1;
	else retrievedLength = contentLength;

	res.statusCode = start != null || end != null ? 206 : 200;

	res.setHeader("content-length", retrievedLength);

	if (range) {
		res.setHeader(
			"content-range",
			`bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`
		);
		res.setHeader("accept-ranges", "bytes");
	}

	const fileStream = createReadStream(filePath, options);
	fileStream.pipe(res);
});
