import { Router } from "express";
import { body, CustomValidator } from "express-validator";

import { createVideo, getVideo, deleteVideo } from "../controllers/video";
import upload from "../configs/multer";
import UserModel from "../models/user";

const router = Router();

const isValidUser: CustomValidator = async val => {
  const exists = await UserModel.exists({ username: val });
  if (!exists) throw new Error("User does not exist.");
};

router
  .route("/create")
  .post(
    upload.single("video"),
    body("username")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Log in to continue.")
      .custom(isValidUser),
    createVideo
  );

router.route("/:id").get(getVideo).delete(deleteVideo);

export default router;
