import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { connect } from "mongoose";
import { join } from "path";

import router from "./routes";
import { handleError, CustomError } from "./controllers/error";

config();
const app = express();

// setup
app.use(cors());
app.use(express.static(join(__dirname, "public")));
app.use(express.json({ limit: "30mb" }));

connect(process.env.DB_URL!)
  .then(() => console.log("Connected to database."))
  .catch(err => {
    console.log(err);
    process.exit(-1);
  });

// routing
app.use(router);

// not found
app.use("*", () => {
  throw new CustomError(404, "Not found.");
});

// error handler
app.use(handleError);

app.listen(process.env.port || 5000, () => console.log("Server started."));
