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

// export async function videoStream(path: string, range: string) {
// const videoSize = statSync(path).size;
// const chunkSize = 1048576; // 1MB
// // range looks like this: "bytes=32123-"
// const start = Number(range.replace(/\D/g, ""));
// const end = Math.min(start + chunkSize, videoSize - 1);

// // response headers
// const contentLength = end - start + 1;
// const videoStream = createReadStream(path, { start, end });
// }
