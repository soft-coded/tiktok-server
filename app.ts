import { config } from "dotenv";
import express from "express";
import cors from "cors";

import router from "./routes";
import { handleError, CustomError } from "./controllers/error";

config();
const app = express();

// setup
app.use(cors());
app.use(express.static("public"));
app.use(express.json({ limit: "30mb" }));
app.use(router);

// not found
app.use("*", () => {
  throw new CustomError(404, "Not found.");
});

// error
app.use(handleError);

app.listen(process.env.port || 5000, () => console.log("Server started."));
