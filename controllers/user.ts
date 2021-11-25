import asyncHandler from "express-async-handler";

import UserModel from "../models/user";
import { successRes } from "../utils/success";

type queryData = {
	name?: "1";
	email?: "1";
	description?: "1";
	profilePhoto?: "1";
	totalLikes?: "1";
	following?: "list" | "num";
	followers?: "list" | "num";
	videos?: "uploaded" | "liked" | "all";
	all?: "1";
};

export const getUserData = asyncHandler(async (req, res) => {
	const findRes = await UserModel.findOne(
		{ username: req.params.username },
		"-__v -password"
	);

	let query: queryData = req.query;
	if (
		query.videos === "uploaded" ||
		query.videos === "all" ||
		query.all === "1"
	)
		await findRes.populate("videos.uploaded", "video");
	if (query.videos === "liked" || query.videos === "all" || query.all === "1")
		await findRes.populate("videos.liked", "video");
	if (query.followers === "list" || query.all === "1")
		await findRes.populate("followers");
	if (query.following === "list" || query.all === "1")
		await findRes.populate("following");

	const user = findRes.toObject();
	user.userId = user._id;
	delete user._id;

	if (query.all === "1") {
		res.status(200).json(successRes({ data: user }));
		return;
	}
	if (query.name !== "1") delete user.name;
	if (query.email !== "1") delete user.email;
	if (query.description !== "1") delete user.description;
	if (query.totalLikes !== "1") delete user.totalLikes;
	if (query.profilePhoto !== "1") delete user.profilePhoto;

	if (query.following === "num") user.following = user.following.length;
	else if (query.following !== "list" && query.following !== "num")
		delete user.following;

	if (query.followers === "num") user.followers = user.followers.length;
	else if (query.followers !== "list" && query.followers !== "num")
		delete user.followers;

	if (query.videos === "uploaded") user.videos = user.videos.uploaded;
	else if (query.videos === "liked") user.videos = user.videos.liked;
	else if (query.videos !== "all") delete user.videos;

	res.status(200).json(successRes({ data: user }));
});
