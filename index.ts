import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { connect } from "mongoose";

import router from "./routes";
import { handleError, CustomError } from "./utils/error";

config();
const app = express();

// setup
const whitelist = [process.env.WEBSITE_URL, "http://localhost:3000"];
app.use(
	cors({
		origin: (origin, cb) => {
			if (!origin || whitelist.indexOf(origin) > -1) cb(null, true);
			else cb(new Error("Not allowed by CORS"));
		}
	})
);
app.use(express.json({ limit: "30mb" }));

connect(process.env.DB_URL!)
	.then(() => console.log("Connected to database"))
	.catch(err => {
		console.log(err);
		process.exit(-1);
	});

// routing
app.use(router);

// not found
app.use("*", () => {
	throw new CustomError(404, "Not found");
});

// error handler
app.use(handleError);

app.listen(process.env.PORT || 5000, () => console.log("Server started"));
