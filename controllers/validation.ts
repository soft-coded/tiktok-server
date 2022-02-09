import { NextFunction, Request, Response } from "express";
import { validationResult, CustomValidator } from "express-validator";
import { verify } from "jsonwebtoken";
import asyncHandler from "express-async-handler";

import { CustomError } from "../utils/error";
import { removeFile } from "../utils/fileHander";
import VideoModel, { ExtendedVideo } from "../models/video";
import UserModel from "../models/user";
import constants from "../utils/constants";

export const isValidUser: CustomValidator = async val => {
	try {
		const exists = await UserModel.exists({ username: val });
		if (!exists) throw "";
	} catch {
		throw new Error("User does not exist");
	}
};

export const isValidVideo: CustomValidator = async val => {
	try {
		const exists = await VideoModel.exists({ _id: val });
		if (!exists) throw "";
	} catch {
		throw new Error("Video does not exist");
	}
};

export const isValidComment: CustomValidator = async (val, { req }) => {
	try {
		// keep query.videoId before body.videoId, doesn't work the other way round
		const videoId = req.query!.videoId ? req.query!.videoId : req.body.videoId;
		const exists = await VideoModel.exists({
			_id: videoId,
			"comments._id": val
		});
		if (!exists) throw "";
	} catch {
		throw new Error("Comment does not exist");
	}
};

export function valRes(req: Request, _: Response, next: NextFunction) {
	const vRes = validationResult(req);
	if (!vRes.isEmpty()) {
		if (req.file)
			removeFile(
				req.file.filename,
				req.file.fieldname === "video"
					? constants.tempFolder
					: constants.pfpFolder
			);
		throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
	}
	next();
}

export const verifyToken = asyncHandler(async (req, _, next) => {
	try {
		let username: string;
		if (req.body.username) username = req.body.username;
		else if (req.body.loggedInAs) username = req.body.loggedInAs;
		else username = req.params.username;

		const DBUser = await UserModel.findOne({ username }, "username -_id");
		const tokenUsername = verify(req.body.token, process.env.TOKEN_SECRET!);

		if (DBUser!.username !== tokenUsername) throw "";

		next();
	} catch {
		if (req.file)
			removeFile(
				req.file.filename,
				req.file.fieldname === "video"
					? constants.tempFolder
					: constants.pfpFolder
			);
		throw new CustomError(403, "You are not allowed to perform this action");
	}
});
