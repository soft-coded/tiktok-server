import asyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import { unlinkSync } from "fs";
import { join } from "path";

import { CustomError } from "./error";
import VideoModel from "../models/video";
import UserModel from "../models/user";

export const createVideo = asyncHandler(async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
  if (!req.file) throw new CustomError(500, "Video upload unsuccessful.");

  const user = await UserModel.findOne(
    { username: req.body.username },
    "videos.uploaded"
  );
  const video = await VideoModel.create({
    uploader: user._id,
    video: req.file.filename,
    caption: req.body.caption,
    music: req.body.music,
    tags: req.body.tags
  });
  user.videos.uploaded.push(video._id);
  await user.save();

  res.status(201).json({
    success: true,
    videoId: video._id
  });
});

type query = {
  uploader?: "1";
  caption?: "1";
  music?: "1";
  tags?: "1";
  shares?: "1";
  views?: "1";
  createdAt?: "1";
  likes?: "num" | "list";
  comments?: "num" | "list";
  all?: "1";
};

export const getVideo = asyncHandler(async (req, res) => {
  const findRes = await VideoModel.findById(req.params.id, "-__v");
  if (!findRes) throw new CustomError(400, "Video not found.");

  const query: query = req.query;
  if (query.uploader === "1" || query.all === "1")
    await findRes.populate("uploader", "username name -_id");
  if (query.likes === "list" || query.all === "1")
    await findRes.populate("likes", "username -_id");
  if (query.comments === "list" || query.all === "1")
    await findRes.populate("comments", "-replies");

  const video = findRes.toObject();
  video.videoId = video._id;
  delete video._id;

  if (query.all === "1") {
    res.status(200).json({
      success: true,
      data: video
    });
    return;
  }
  if (query.uploader !== "1") delete video.uploader;
  if (query.caption !== "1") delete video.caption;
  if (query.music !== "1") delete video.music;
  if (query.views !== "1") delete video.views;
  if (query.shares !== "1") delete video.shares;
  if (query.tags !== "1") delete video.tags;
  if (query.createdAt !== "1") delete video.createdAt;

  if (query.likes === "num") video.likes = video.likes.length;
  else if (query.likes !== "list") delete video.likes;
  if (query.comments === "num") video.comments = video.comments.length;
  else if (query.comments !== "list") delete video.comments;

  res.status(200).json({
    success: true,
    data: video
  });
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const user = await UserModel.findOne({ username: req.body.username }, "_id");
  if (!user) throw new CustomError(401, "Not allowed.");
  const video = await VideoModel.findById(req.params.id, "uploader video");
  if (!video) throw new CustomError(400, "Video does not exist.");
  if (!user._id.equals(video.uploader))
    throw new CustomError(403, "You are not allowed to perform this action.");

  try {
    unlinkSync(join(process.cwd(), "public", "uploads", video.video));
  } catch (err) {
    throw new CustomError(400, "File no longer exists.");
  }
  await VideoModel.findByIdAndDelete(video._id);

  res.status(200).json({
    success: true
  });
});
