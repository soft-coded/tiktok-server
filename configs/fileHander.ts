import { unlink } from "fs";
import { join } from "path";

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
