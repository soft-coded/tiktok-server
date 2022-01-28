import multer, { diskStorage, FileFilterCallback } from "multer";
import { extname } from "path";

import constants from "./constants";
import { getRelativePath } from "./fileHander";

function generateFileName(username: string, file: Express.Multer.File) {
	return (
		username +
		"_" +
		file.fieldname +
		"_" +
		Date.now() +
		Math.round(Math.random() * 1e9) +
		extname(file.originalname)
	);
}

const videoStorage = diskStorage({
	destination: (_, __, cb) => {
		cb(null, getRelativePath(constants.tempFolder));
	},
	filename: (req, file, cb) => {
		cb(null, generateFileName(req.body.username, file));
	}
});

const photoStorage = diskStorage({
	destination: (_, __, cb) => {
		cb(null, getRelativePath(constants.pfpFolder));
	},
	filename: (req, file, cb) => {
		let username: string;
		if (req.body.username) username = req.body.username;
		else username = req.params.username;

		cb(null, generateFileName(username, file));
	}
});

function fileFilter(
	_: Express.Request,
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
		return cb(new Error("File type not allowed"));
	}
	cb(null, true);
}

export const uploadVideo = multer({
	storage: videoStorage,
	limits: {
		fileSize: 41943040, // 40MB
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
