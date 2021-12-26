import { unlink } from "fs";
import { join } from "path";

export function getRelativePath(...paths: string[]) {
	return join(process.cwd(), "public", ...paths);
}

export function removeFile(fileName: string, folder: string) {
	unlink(getRelativePath(folder, fileName), err => {
		if (err) console.error(err);
	});
}
