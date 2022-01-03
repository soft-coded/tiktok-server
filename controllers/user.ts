import asyncHandler from "express-async-handler";
import { compare, hash } from "bcryptjs";

import UserModel, { ExtendedUser, Notification } from "../models/user";
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
	notifications?: "1";
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
		"-_id -__v -interestedIn -password -profilePhoto -following -followers -videos -notifications";

	if (query.name !== "1") projection += " -name";
	if (query.email !== "1") projection += " -email";
	if (query.description !== "1") projection += " -description";
	if (query.totalLikes !== "1") projection += " -totalLikes";
	if (query.createdAt !== "1") projection += " -createdAt";

	const user: ExtendedUser = await UserModel.findOne(
		{ username: req.params.username },
		projection
	).lean();

	if (query.notifications === "1")
		user.notifications = (await UserModel.findOne(
			{ username: req.params.username },
			"notifications -_id"
		)
			.populate("notifications.by", "username -_id")
			.lean())!.notifications.reverse();

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

export async function createNotification(userId: string, data: Notification) {
	// do nothing if it's the uploader's own action
	if ((userId as any).equals(data.by)) return;

	const user: ExtendedUser = (await UserModel.findById(
		userId,
		"notifications"
	))!;

	const notification = user.notifications.create(data);
	user.notifications.push(notification);
	await user.save();
}

type MetaType = {
	type: Notification["type"];
	refId: Notification["refId"];
	by: Notification["by"];
};

export async function deleteNotification(
	using: "ref" | "id",
	userId: string,
	idOrMeta: string | MetaType
) {
	if (using === "id") {
		const user: ExtendedUser = (await UserModel.findById(
			userId,
			"notifications"
		))!;
		const notification = user.notifications.id(idOrMeta);
		if (notification) {
			notification.remove();
			await user.save();
		}
		return;
	}
	// do nothing if it's the uploader's own action
	if ((userId as any).equals((idOrMeta as MetaType).by)) return;

	await UserModel.findByIdAndUpdate(userId, {
		$pull: { notifications: idOrMeta }
	}).exec();
}

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

		// delete the notification
		deleteNotification("ref", toFollow._id, {
			type: "followed",
			refId: toFollow._id,
			by: loggedInAs._id
		});
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

		// notify the person followed
		createNotification(toFollow._id, {
			type: "followed",
			message: "followed you.",
			refId: toFollow._id,
			by: loggedInAs._id
		});
	}

	res.status(200).json(successRes({ followed }));
});

export const hasNewNotifs = asyncHandler(async (req, res) => {
	const user: any = await UserModel.findOne(
		{ username: req.body.username },
		{ lastNotif: { $arrayElemAt: ["$notifications", -1] } }
	).lean();

	res
		.status(200)
		.json(
			successRes({ hasNew: user.lastNotif ? !user.lastNotif.read : false })
		);
});

export const readAllNotifs = asyncHandler(async (req, res) => {
	await UserModel.findOneAndUpdate(
		{ username: req.body.username },
		{
			$set: { "notifications.$[elem].read": true }
		},
		{ arrayFilters: [{ "elem.read": false }], multi: true }
	).exec();

	res.status(200).json(successRes());
});

export const delOneNotif = asyncHandler(async (req, res) => {
	const user = await UserModel.findOne(
		{ username: req.body.username },
		"_id"
	).lean();
	await deleteNotification("id", user!._id, req.body.notificationId);

	res.status(200).json(successRes());
});
