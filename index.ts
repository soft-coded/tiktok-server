import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { connect } from "mongoose";
import compression from "compression";
import { Server } from "socket.io";
import { createServer } from "http";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

import router from "./routes";
import { compressVideo } from "./controllers/video";
import { handleError, CustomError } from "./utils/error";
import { getRelativePath } from "./utils/fileHander";
import constants from "./utils/constants";

config();
const app = express();
const server = createServer(app);

const whitelist = [process.env.WEBSITE_URL, "http://localhost:3000"];
type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];
function checkOrigin(
	origin: string | undefined,
	cb: (err: Error | null, origin?: StaticOrigin) => void
) {
	if (!origin || whitelist.indexOf(origin) > -1) cb(null, true);
	else cb(new Error("Not allowed by CORS"));
}

const io = new Server(server, { cors: { origin: checkOrigin } });

// setup
app.use(cors({ origin: checkOrigin }));
app.use(express.json({ limit: "100mb" }));
app.use(compression());

connect(process.env.DB_URL!)
	.then(() => console.log("Connected to database"))
	.catch(err => {
		console.log(err);
		process.exit(-1);
	});

// socket.io connection
io.on("connection", socket => {
	console.log("socket connected on", socket.id);

	socket.on("finaliseFile", data => compressVideo(data, socket));
});

// folder creation
const publicFolder = join(process.cwd(), "public");
if (!existsSync(publicFolder)) {
	mkdirSync(publicFolder);
	mkdirSync(getRelativePath(constants.videosFolder));
	mkdirSync(getRelativePath(constants.pfpFolder));
	mkdirSync(getRelativePath(constants.tempFolder));
}

// routing
app.use(router);

// not found
app.use("*", () => {
	throw new CustomError(404, "Route not found");
});

// error handler
app.use(handleError);

server.listen(process.env.PORT || 5000, () => console.log("Server started"));
