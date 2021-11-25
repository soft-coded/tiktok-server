import asyncHandler from "express-async-handler";

import { CustomError } from "./error";
import { removeFile } from "../configs/fileHander";
import VideoModel from "../models/video";
import UserModel from "../models/user";

export const createVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new CustomError(500, "Video upload unsuccessful.");

  const user = await UserModel.findOne({ username: req.body.username }, "_id");
  const video = await VideoModel.create({
    uploader: user._id,
    video: req.file.filename,
    caption: req.body.caption,
    music: req.body.music,
    tags: req.body.tags
  });

  UserModel.findByIdAndUpdate(user._id, {
    $push: { "videos.uploaded": video._id }
  }).exec(); // !! exec() is important !!

  res.status(201).json({
    success: true,
    videoId: video._id
  });
});

type Query = {
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

  const query: Query = req.query;
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
  const video = await VideoModel.findById(
    req.params.id,
    "uploader video likes"
  );
  if (!user._id.equals(video.uploader))
    throw new CustomError(403, "You are not allowed to perform this action.");

  // file deletion and removal doesn't need to be synchronous
  removeFile(video.video);
  UserModel.findByIdAndUpdate(user._id, {
    $pull: { "videos.uploaded": video._id },
    $inc: { totalLikes: -video.likes.length } // decrement the totalLikes of the uploader
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
  const liker = await UserModel.findOne(
    { username: req.body.username },
    "_id"
  ).lean();
  let liked: boolean; // if the video was liked or disliked, used in response
  /* not a smart idea to load the entire "likes" array, so just check it in the database. */
  let video = await VideoModel.findOne(
    { _id: req.body.videoId, likes: liker._id },
    "likes uploader"
  ).lean();
  if (video) {
    liked = false;

    // update asynchronously
    VideoModel.findByIdAndUpdate(video._id, {
      $pull: { likes: liker._id }
    }).exec(); // !! exec() is important !!

    // update total likes of the uploader
    UserModel.findByIdAndUpdate(video.uploader, {
      $inc: { totalLikes: -1 }
    }).exec();

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

    UserModel.findByIdAndUpdate(video.uploader, {
      $inc: { totalLikes: 1 }
    }).exec();

    UserModel.findByIdAndUpdate(liker._id, {
      $push: { "videos.liked": video._id }
    }).exec();
  }

  res.status(202).json({
    success: true,
    liked
  });
});

export const comment = asyncHandler(async (req, res) => {
  const user = await UserModel.findOne({ username: req.body.username }, "_id");
  const video = await VideoModel.findById(req.body.videoId, "comments");

  const comment = video.comments.create({
    postedBy: user._id,
    comment: req.body.comment
  });
  video.comments.push(comment);
  await video.save();

  res.status(201).json({
    success: true,
    commentId: comment._id
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const user = await UserModel.findOne({ username: req.body.username }, "_id");
  const video = await VideoModel.findById(req.body.videoId, "comments");
  const comment = video.comments.id(req.body.commentId);

  if (!comment) throw new CustomError(404, "Comment does not exist.");
  if (!comment.postedBy.equals(user._id))
    throw new CustomError(403, "You are not allowed to perform this action.");

  comment.remove();
  await video.save();

  res.status(200).json({
    success: true
  });
});
