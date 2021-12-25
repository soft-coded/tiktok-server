import asyncHandler from "express-async-handler";
import { compare, hash } from "bcryptjs";

import UserModel, { ExtendedUser } from "../models/user";
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
	loggedInAs?: string;
};

async function getNum(field: string, username: string) {
	const userData: ExtendedUser = await UserModel.findOne(
		{ username },
		{
			num: { $size: "$" + field },
			_id: 0
		}
	).lean();

	return userData.num;
}

export async function isFollowing(loggedInAs: string, toCheck: string) {
	const user = (await UserModel.findOne(
		{ username: loggedInAs },
		"_id"
	).lean())!;

	return await UserModel.exists({
		username: toCheck,
		followers: user._id as any
	});
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

	const user: ExtendedUser = await UserModel.findOne(
		{ username: req.params.username },
		projection
	).lean();

	if (query.followers === "num")
		user.followers = await getNum("followers", req.params.username);
	else if (query.followers === "list")
		user.followers = (await UserModel.findOne(
			{ username: req.params.username },
			"followers -_id"
		)
			.populate("followers", "username name -_id")
			.lean())!.followers.reverse(); // reversed to keep the latest first

	if (query.following === "num")
		user.following = await getNum("following", req.params.username);
	else if (query.following === "list")
		user.following = (await UserModel.findOne(
			{ username: req.params.username },
			"following -_id"
		)
			.populate("following", "username name -_id")
			.lean())!.following.reverse();

	if (query.videos === "uploaded" || query.videos === "liked")
		user.videos = (await UserModel.findOne(
			{ username: req.params.username },
			"-_id videos." + query.videos
		))!.videos[query.videos].reverse();

	if (query.loggedInAs)
		user.isFollowing = await isFollowing(query.loggedInAs, req.params.username);

	res.status(200).json(successRes(user));
});

type UpdateQuery = {
	changePfp?: "update" | "delete";
	oldPassword?: string;
	newPassword?: string;
	name?: string;
	email?: string;
	description?: string;
};

export const updateUser = asyncHandler(async (req, res) => {
	try {
		const user = (await UserModel.findOne(
			{ username: req.params.username },
			"name email description profilePhoto password"
		))!;
		const updateQuery: UpdateQuery = req.body;
		let fileNeeded = false; // whether an unnecessary file was sent

		if (updateQuery.changePfp === "update") {
			if (!req.file) throw new CustomError(500, "Photo upload unsuccessful");
			fileNeeded = true;
			// remove the old pfp if it's not the default one
			// !!! do not remove the default photo !!!
			if (user.profilePhoto !== "default.png")
				removeFile(user.profilePhoto, constants.pfpFolder);

			user.profilePhoto = req.file.filename;
		} else if (updateQuery.changePfp === "delete") {
			if (user.profilePhoto !== "default.png")
				removeFile(user.profilePhoto, constants.pfpFolder);
			else throw new CustomError(404, "Profile photo does not exist");

			user.profilePhoto = "default.png";
		}

		if (updateQuery.oldPassword && updateQuery.newPassword) {
			const matches = await compare(updateQuery.oldPassword, user.password);
			if (!matches) throw new CustomError(400, "Incorrect old password");

			const hashedPassword = await hash(updateQuery.newPassword, 10);
			user.password = hashedPassword;
		} else if (updateQuery.oldPassword || updateQuery.newPassword)
			throw new CustomError(400, "Both old and new passwords are required");

		if (updateQuery.name) user.name = updateQuery.name;
		if (updateQuery.email) user.email = updateQuery.email;
		if (updateQuery.description) user.description = updateQuery.description;

		await user.save();

		res.status(200).json(successRes());
		// remove the unnecessary file, if sent
		if (!fileNeeded && req.file)
			removeFile(req.file.filename, constants.pfpFolder);
	} catch (err: any) {
		if (req.file) {
			removeFile(req.file.filename, constants.pfpFolder);
		}
		throw err;
	}
});

export const getPfp = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.params.username },
		"profilePhoto -_id"
	);

	res.sendFile(getRelativePath(constants.pfpFolder, user!.profilePhoto));
});

export const followOrUnfollow = asyncHandler(async (req, res) => {
	const loggedInAs = (await UserModel.findOne(
		{ username: req.body.loggedInAs },
		"_id"
	).lean())!;
	let toFollow = await UserModel.findOne(
		{
			username: req.body.toFollow,
			followers: loggedInAs._id as any
		},
		"_id"
	).lean();
	let followed = true; // whether followed or unfollowed

	if (toFollow) {
		followed = false;

		// remove from loggedInAs' following list
		UserModel.findByIdAndUpdate(loggedInAs._id, {
			$pull: { following: toFollow._id }
		})
			.exec()
			.catch(err => console.error(err));

		// remove from toFollow's followers list
		UserModel.findByIdAndUpdate(toFollow._id, {
			$pull: { followers: loggedInAs._id }
		})
			.exec()
			.catch(err => console.error(err));
	} else {
		toFollow = (await UserModel.findOne(
			{ username: req.body.toFollow },
			"_id"
		).lean())!;

		// add to loggedInAs' following list
		UserModel.findByIdAndUpdate(loggedInAs._id, {
			$push: { following: toFollow._id }
		})
			.exec()
			.catch(err => console.error(err));

		// add to toFollow's followers list
		UserModel.findByIdAndUpdate(toFollow._id, {
			$push: { followers: loggedInAs._id }
		})
			.exec()
			.catch(err => console.error(err));
	}

	res.status(200).json(successRes({ followed }));
});
