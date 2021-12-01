import asyncHandler from "express-async-handler";
import { compare, hash } from "bcryptjs";

import UserModel from "../models/user";
import { CustomError } from "../utils/error";
import { successRes } from "../utils/success";
import { removeFile, getRelativePath } from "../utils/fileHander";
import constants from "../utils/constants";

type Query = {
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
export const getUser = asyncHandler(async (req, res) => {
	const findRes = await UserModel.findOne(
		{ username: req.params.username },
		"-__v -password -interestedIn -createdAt"
	);

	let query: Query = req.query;
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

export const updateUser = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.params.username },
		"name email description username"
	);
	const { name, email, description } = req.body;

	if (name) user.name = name;
	if (email) user.email = email;
	if (description) user.description = description;

	await user.save();

	res.status(200).json(successRes({ data: user }));
});

export const getPfp = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.params.username },
		"profilePhoto -_id"
	);

	res.sendFile(getRelativePath(constants.pfpFolder, user.profilePhoto));
});

export const updatePfp = asyncHandler(async (req, res) => {
	if (!req.file) throw new CustomError(500, "Photo upload unsuccessful.");

	// !!! need token verification here !!!!
	const user = await UserModel.findOne(
		{ username: req.params.username },
		"profilePhoto"
	);
	// remove the old pfp if it's not the default one
	// !!! do not remove the default photo !!!
	if (user.profilePhoto !== "default.png")
		removeFile(user.profilePhoto, constants.pfpFolder);

	user.profilePhoto = req.file.filename;
	await user.save();

	res.status(200).json(successRes());
});

export const deletePfp = asyncHandler(async (req, res) => {
	// !!! need token verification here !!!
	const user = await UserModel.findOne(
		{ username: req.params.username },
		"profilePhoto"
	);

	if (user.profilePhoto !== "default.png")
		removeFile(user.profilePhoto, constants.pfpFolder);
	else throw new CustomError(404, "Profile photo does not exist.");

	user.profilePhoto = "default.png";
	await user.save();

	res.status(200).json(successRes());
});

export const changePassword = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.body.username },
		"password"
	);
	const matches = await compare(req.body.oldPassword, user.password);
	if (!matches) throw new CustomError(400, "Incorrect old password.");

	const hashedPassword = await hash(req.body.newPassword, 10);
	user.password = hashedPassword;
	await user.save();

	res.status(200).json(successRes({ username: req.body.username }));
});
