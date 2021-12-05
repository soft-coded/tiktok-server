import asyncHandler from "express-async-handler";
import video from "../models/video";

import VideoModel from "../models/video";
import { successRes } from "../utils/success";

const feedLimit = 10;

function incrementViews(videoId: string) {
	VideoModel.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).catch(err =>
		console.error(err)
	);
}

export const getFeed = asyncHandler(async (_, res) => {
	const videos = await VideoModel.find(
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
			createdAt: 1,
			_l: { $size: "$likes" },
			_c: { $size: "$comments" }
		},
		{
			limit: feedLimit,
			lean: true,
			sort: "-views -_l -_c createdAt",
			populate: { path: "uploader", select: "username name -_id" }
		}
	);

	res.status(200).json(successRes({ videos }));

	videos.forEach(video => incrementViews(video.videoId));
});
