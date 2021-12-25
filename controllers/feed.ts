import asyncHandler from "express-async-handler";

import VideoModel, { ExtendedVideo } from "../models/video";
import UserModel from "../models/user";
import { successRes } from "../utils/success";
import { hasLiked } from "./video";
import { isFollowing } from "./user";
import { shuffle } from "../utils/helpers";

const feedLimit = 10;
const followingLimit = 5;

async function fetchVidFromDB(videoId: string) {
	const vid: ExtendedVideo = (await VideoModel.findById(videoId, {
		videoId: "$_id",
		_id: 0,
		uploader: 1,
		music: 1,
		caption: 1,
		tags: 1,
		totalLikes: { $size: "$likes" },
		totalComments: 1,
		shares: 1,
		views: 1,
		createdAt: 1
	})
		.populate("uploader", "username name -_id")
		.lean())!;

	vid.likes = vid.totalLikes;
	vid.comments = vid.totalComments;
	delete vid.totalLikes;
	delete vid.totalComments;

	return vid;
}

function incrementViews(videoId: string) {
	VideoModel.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).catch(err =>
		console.error(err)
	);
}

export const getFeed = asyncHandler(async (req, res) => {
	const videos: ExtendedVideo[] = await VideoModel.find(
		{},
		{
			videoId: "$_id",
			_id: 0,
			uploader: 1,
			music: 1,
			caption: 1,
			tags: 1,
			likes: { $size: "$likes" },
			comments: "$totalComments",
			shares: 1,
			views: 1,
			createdAt: 1
		},
		{
			limit: feedLimit,
			skip: req.query.skip ? +req.query.skip : 0,
			lean: true,
			sort: "-createdAt -views -likes",
			populate: { path: "uploader", select: "username name -_id" }
		}
	);
	shuffle(videos);

	// forEach loop won't work here because "await"
	if (req.query.username) {
		for (let video of videos) {
			video.hasLiked = await hasLiked(
				video.videoId!,
				req.query.username as string
			);

			video.isFollowing = await isFollowing(
				req.query.username as string,
				video.uploader.username
			);
		}
	}

	res.status(200).json(successRes({ videos }));

	videos.forEach(video => incrementViews(video.videoId!));
});

export const getSuggested = asyncHandler(async (req, res) => {
	const users = await UserModel.find(
		{},
		{
			username: 1,
			name: 1,
			_id: 0,
			"videos.uploaded": { $slice: [-2, 1] }
		},
		{
			sort: "-totalLikes -followers -createdAt",
			limit: req.query.limit ? +req.query.limit : 0
		}
	).lean();

	res.status(200).json(successRes({ users }));
});

export const getFollowingVids = asyncHandler(async (req, res) => {
	const users = (await UserModel.findOne(
		{ username: req.query.username as string },
		"following -_id"
	)
		.populate("following", {
			_id: 0,
			"videos.uploaded": {
				$slice: [
					req.query.skip
						? -parseInt(req.query.skip as string)
						: -followingLimit,
					followingLimit
				]
			}
		})
		.lean())!.following;

	const videos = [];
	for (let following of users) {
		for (let uploadedVid of following.videos.uploaded) {
			const vid = await fetchVidFromDB(uploadedVid as any);
			vid.hasLiked = await hasLiked(
				uploadedVid as any,
				req.query.username as string
			);
			videos.push(vid);
		}
	}
	shuffle(videos);

	res.status(200).json(successRes({ videos }));

	videos.forEach(video => incrementViews(video.videoId!));
});

export const search = asyncHandler(async (req, res) => {
	const regex = new RegExp(req.body.query, "ig");

	if (req.body.send === "accounts") {
		const accounts = await UserModel.find(
			{
				$or: [{ username: regex }, { name: regex }]
			},
			{
				_id: 0,
				username: 1,
				name: 1,
				followers: { $size: "$followers" },
				description: 1
			},
			{ lean: true }
		);

		res.status(200).json(successRes({ accounts }));
		return;
	}

	const videos: ExtendedVideo[] = await VideoModel.find(
		{
			$or: [{ caption: regex }, { tags: regex as any }]
		},
		{
			caption: 1,
			views: 1,
			uploader: 1,
			tags: 1,
			_id: 0,
			videoId: "$_id"
		},
		{
			populate: { path: "uploader", select: "username -_id" },
			lean: true
		}
	);

	res.status(200).json(successRes({ videos }));

	videos.forEach(video => incrementViews(video.videoId!));
});
