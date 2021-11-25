import { Router } from "express";
import { body, param } from "express-validator";

import {
  createVideo,
  getVideo,
  deleteVideo,
  likeOrUnlike,
  comment
} from "../controllers/video";
import upload from "../configs/multer";
import { isValidUser, isValidVideo, valRes } from "../controllers/validation";

const router = Router();

router
  .route("/create")
  .post(
    upload.single("video"),
    body("username")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Log in to continue.")
      .custom(isValidUser),
    valRes,
    createVideo
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
    valRes,
    likeOrUnlike
  );

router
  .route("/comment")
  .post(
    body("username")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Log in to continue.")
      .custom(isValidUser),
    body("videoId")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Video does not exist.")
      .custom(isValidVideo),
    body("comment")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Comment cannot be empty."),
    valRes,
    comment
  );

// route to a single video, keep below everything else
router
  .route("/:id")
  .get(
    param("id")
      .exists({ checkFalsy: true, checkNull: true })
      .withMessage("Invalid URL.")
      .custom(isValidVideo),
    valRes,
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
    valRes,
    deleteVideo
  );

export default router;
