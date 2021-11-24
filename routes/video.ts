import { Router } from "express";
import { body, CustomValidator, param } from "express-validator";

import {
  createVideo,
  getVideo,
  deleteVideo,
  likeOrUnlike
} from "../controllers/video";
import upload from "../configs/multer";
import UserModel from "../models/user";
import VideoModel from "../models/video";

const router = Router();

const isValidUser: CustomValidator = async val => {
  try {
    const exists = await UserModel.exists({ username: val });
    if (!exists) throw "";
  } catch {
    throw new Error("User does not exist.");
  }
};

const isValidVideo: CustomValidator = async val => {
  try {
    const exists = await VideoModel.exists({ _id: val });
    if (!exists) throw "";
  } catch {
    throw new Error("Video does not exist.");
  }
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

router
  .route("/:id")
  .get(
    param("id")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Invalid URL.")
      .custom(isValidVideo),
    getVideo
  )
  .delete(
    param("id")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Invalid URL.")
      .custom(isValidVideo),
    body("username")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Log in to continue.")
      .custom(isValidUser),
    deleteVideo
  );

router
  .route("/like")
  .post(
    body("username")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Log in to continue.")
      .custom(isValidUser),
    body("videoId")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Video does not exist.")
      .custom(isValidVideo),
    likeOrUnlike
  );

export default router;
