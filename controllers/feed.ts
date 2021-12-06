import asyncHandler from "express-async-handler";

import VideoModel, { ExtendedVideo } from "../models/video";
import { successRes } from "../utils/success";
import { hasLiked } from "./video";

const feedLimit = 10;

function incrementViews(videoId: string) {
	VideoModel.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).catch(err =>
		console.error(err)
	);
}

export const getFeed = asyncHandler(async (req, res) => {
	const videos: ExtendedVideo[] = (await VideoModel.find(
		{},
		{
			videoId: "$_id",
			_id: 0,
			uploader: 1,
			music: 1,
			caption: 1,
			tags: 1,
			likes: { $size: "$likes" },
			comments: { $size: "$comments" },
			shares: 1,
			views: 1,
			createdAt: 1
		},
		{
			limit: feedLimit,
			lean: true,
			sort: "-views createdAt",
			populate: { path: "uploader", select: "username name -_id" }
		}
	))!;

	// forEach loop won't work here because "async"
	if (req.query.username) {
		for (let video of videos) {
			video.hasLiked = await hasLiked(
				video.videoId!,
				req.query.username as string
			);
		}
	}

	res.status(200).json(successRes({ videos }));

	videos.forEach(video => incrementViews(video.videoId!));
});
