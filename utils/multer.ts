import multer, { diskStorage, FileFilterCallback } from "multer";
import { join, extname } from "path";
import { Request } from "express";

import constants from "./constants";

const videoStorage = diskStorage({
	destination: (_, __, cb) => {
		cb(null, join(process.cwd(), "public", constants.videosFolder));
	},
	filename: (req, file, cb) => {
		cb(
			null,
			req.body.username +
				"_" +
				file.fieldname +
				"_" +
				Date.now() +
				Math.round(Math.random() * 1e9) +
				file.originalname
		);
	}
});

const photoStorage = diskStorage({
	destination: (_, __, cb) => {
		cb(null, join(process.cwd(), "public", constants.pfpFolder));
	},
	filename: (req, file, cb) => {
		let username: string;
		if (req.body.username) username = req.body.username;
		else username = req.params.username;

		cb(
			null,
			username +
				"_" +
				file.fieldname +
				"_" +
				Date.now() +
				Math.round(Math.random() * 1e9) +
				file.originalname
		);
	}
});

function fileFilter(
	_: Request,
	file: Express.Multer.File,
	cb: FileFilterCallback
) {
	let allowedTypes: RegExp;
	if (file.fieldname === "video") allowedTypes = /mp4/i;
	else allowedTypes = /jpeg|jpg|png/i;

	if (
		!allowedTypes.test(extname(file.originalname)) ||
		!allowedTypes.test(file.mimetype)
	) {
		return cb(new Error("File type not allowed."));
	}
	cb(null, true);
}

export const uploadVideo = multer({
	storage: videoStorage,
	limits: {
		fileSize: 20971520, // 20MB
		files: 1
	},
	fileFilter
});

export const uploadPhoto = multer({
	storage: photoStorage,
	limits: {
		fileSize: 2097152, // 2MB
		files: 1
	},
	fileFilter
});
