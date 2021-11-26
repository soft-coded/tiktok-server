import { createReadStream, statSync, unlink } from "fs";
import { join } from "path";
import sharp from "sharp";

export function removeFile(fileName: string, video: boolean = true) {
	unlink(
		join(
			process.cwd(),
			"public",
			video ? "uploads" : "profile-photos",
			fileName
		),
		err => {
			if (err) console.error(err.message);
		}
	);
}

export const photoExt = ".min.jpg";
export async function compressPhoto(path: string) {
	await sharp(path)
		.jpeg({ quality: 30 })
		.toFile(path + photoExt);
	// remove the uncompressed photo
	unlink(path, err => {
		if (err) console.error(err.message);
	});
}
