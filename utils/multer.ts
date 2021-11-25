import multer, { diskStorage, FileFilterCallback } from "multer";
import { join, extname } from "path";
import { Request } from "express";

const storage = diskStorage({
	destination: (_, file, cb) => {
		cb(
			null,
			join(
				process.cwd(),
				"public",
				file.fieldname === "video" ? "uploads" : "profile-photos"
			)
		);
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

const upload = multer({
	storage,
	limits: {
		fileSize: 20971520, // 20MB
		files: 1
	},
	fileFilter
});

export default upload;
