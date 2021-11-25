import { NextFunction, Request, Response } from "express";
import { validationResult, CustomValidator } from "express-validator";

import { CustomError } from "./error";
import { removeFile } from "../configs/fileHander";
import VideoModel from "../models/video";
import UserModel from "../models/user";

export const isValidUser: CustomValidator = async val => {
	try {
		const exists = await UserModel.exists({ username: val });
		if (!exists) throw "";
	} catch {
		throw new Error("User does not exist.");
	}
};

export const isValidVideo: CustomValidator = async val => {
	try {
		const exists = await VideoModel.exists({ _id: val });
		if (!exists) throw "";
	} catch {
		throw new Error("Video does not exist.");
	}
};

export function valRes(req: Request, _: Response, next: NextFunction) {
	const vRes = validationResult(req);
	if (!vRes.isEmpty()) {
		if (req.file) removeFile(req.file.filename, req.file.fieldname === "video");
		throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
	}
	next();
}
