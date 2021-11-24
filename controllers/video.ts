import asyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import { unlink } from "fs";
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
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);

  const findRes = await VideoModel.findById(req.params.id, "-__v");

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
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
  const user = await UserModel.findOne(
    { username: req.body.username },
    "totalLikes"
  );
  const video = await VideoModel.findById(
    req.params.id,
    "uploader video likes"
  );
  if (!user._id.equals(video.uploader))
    throw new CustomError(403, "You are not allowed to perform this action.");

  // file deletion and removal doesn't need to be synchronous
  unlink(join(process.cwd(), "public", "uploads", video.video), err => {
    if (err) console.error(err.message);
  });
  UserModel.findByIdAndUpdate(user._id, {
    $pull: { "videos.uploaded": video._id },
    $set: { totalLikes: user.totalLikes - video.likes.length }
  }).exec(); // !!! does not work without calling exec() !!!
  // need to remove for whoever liked it as well
  UserModel.updateMany(
    { "videos.liked": video._id },
    { $pull: { "videos.liked": video._id } }
  ).exec(); // !!! does not work without calling exec() !!!

  await VideoModel.findByIdAndDelete(video._id);
  res.status(202).json({
    success: true
  });
});

export const likeOrUnlike = asyncHandler(async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);

  const liker = await UserModel.findOne({ username: req.body.username }, "_id");
  let liked: boolean; // if the video was liked or disliked, used in response
  /* not a smart idea to load the entire "likes" array, so just check it in the database. */
  let video = await VideoModel.findOne(
    { _id: req.body.videoId, likes: liker._id },
    "likes uploader"
  ).lean();
  if (video) {
    // update asynchronously
    liked = false;
    VideoModel.findByIdAndUpdate(video._id, {
      $pull: { likes: liker._id }
    }).exec(); // !! exec() is important !!
    // update total liked of the uploader
    UserModel.findById(video.uploader).exec((err, user) => {
      if (err) return console.warn(err.message);
      user.totalLikes--;
      user.save();
    });
    // update "liked videos" array of liker
    UserModel.findByIdAndUpdate(liker._id, {
      $pull: { "videos.liked": video._id }
    }).exec();
  } else {
    liked = true;
    video = await VideoModel.findById(req.body.videoId, "uploader");
    VideoModel.findByIdAndUpdate(video._id, {
      $push: { likes: liker._id }
    }).exec(); // !! exec() is important !!
    UserModel.findById(video.uploader).exec((err, user) => {
      if (err) return console.warn(err.message);
      user.totalLikes++;
      user.save();
    });
    UserModel.findByIdAndUpdate(liker._id, {
      $push: { "videos.liked": video._id }
    }).exec();
  }
  res.status(202).json({
    success: true,
    liked
  });
});
