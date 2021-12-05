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
	totalLikes?: "1";
	createdAt?: "1";
	following?: "list" | "num";
	followers?: "list" | "num";
	videos?: "uploaded" | "liked";
};

async function getNumOrList(
	type: "num" | "list",
	field: string,
	username: string,
	projection?: any
) {
	if (type === "num") {
		const userData = await UserModel.findOne(
			{ username },
			{
				num: { $size: "$" + field },
				_id: 0
			}
		).lean();

		return userData.num;
	}

	const userData = await UserModel.findOne({ username }, field + " -_id")
		.populate(field, projection)
		.lean();

	return userData;
}

export const getUser = asyncHandler(async (req, res) => {
	const query: Query = req.query;
	let projection =
		"-_id -__v -interestedIn -password -profilePhoto -following -followers -videos";

	if (query.name !== "1") projection += " -name";
	if (query.email !== "1") projection += " -email";
	if (query.description !== "1") projection += " -description";
	if (query.totalLikes !== "1") projection += " -totalLikes";
	if (query.createdAt !== "1") projection += " -createdAt";

	const user = await UserModel.findOne(
		{ username: req.params.username },
		projection
	).lean();

	if (query.followers === "num")
		user.followers = await getNumOrList(
			"num",
			"followers",
			req.params.username
		);
	else if (query.followers === "list")
		user.followers = (
			await getNumOrList(
				"list",
				"followers",
				req.params.username,
				"username name -_id"
			)
		).followers;

	if (query.following === "num")
		user.following = await getNumOrList(
			"num",
			"following",
			req.params.username
		);
	else if (query.following === "list")
		user.following = (
			await getNumOrList(
				"list",
				"following",
				req.params.username,
				"username name -_id"
			)
		).following;

	if (query.videos === "uploaded")
		user.videos = (
			await getNumOrList("list", "videos.uploaded", req.params.username, "_id")
		).videos.uploaded;
	else if (query.videos === "liked")
		user.videos = (
			await getNumOrList("list", "videos.liked", req.params.username, "_id")
		).videos.liked;

	res.status(200).json(successRes(user));
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
