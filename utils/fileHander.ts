import { unlink } from "fs";
import { join } from "path";

export function removeFile(fileName: string, folder: string) {
	unlink(join(process.cwd(), "public", folder, fileName), err => {
		if (err) console.error(err.message);
	});
}
