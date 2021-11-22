import { config } from "dotenv";
import express from "express";

import router from "./router";

config();
const app = express();

app.use(router);

app.listen(process.env.port, () => console.log("Server started."));
