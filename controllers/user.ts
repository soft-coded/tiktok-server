import asyncHandler from "express-async-handler";

import UserModel from "../models/user";
import { CustomError } from "./error";

type queryData = {
  username?: string;
  name?: "1";
  email?: "1";
  description?: "1";
  profilePhoto?: "1";
  totalLikes?: "1";
  following?: "list" | "num";
  followers?: "list" | "num";
  videos?: "uploaded" | "liked" | "all";
  all?: "1";
};

export const getUserData = asyncHandler(async (req, res) => {
  let query: queryData = req.query;
  const user = await UserModel.findOne(
    { username: query.username },
    "-__v -password"
  ).lean();
  if (!user) throw new CustomError(400, "User does not exist.");
  user.userId = user._id;
  delete user._id;

  if (query.all === "1") {
    res.status(200).json({
      success: true,
      data: user
    });
    return;
  }
  if (query.name !== "1") delete user.name;
  if (query.email !== "1") delete user.email;
  if (query.description !== "1") delete user.description;
  if (query.totalLikes !== "1") delete user.totalLikes;
  if (query.profilePhoto !== "1") delete user.profilePhoto;

  if (query.following === "num") user.following = user.following.length;
  else if (query.following !== "list" && query.following !== "num")
    delete user.following;

  if (query.followers === "num") user.followers = user.followers.length;
  else if (query.followers !== "list" && query.followers !== "num")
    delete user.followers;

  if (query.videos === "uploaded") user.videos = user.videos.uploaded;
  else if (query.videos === "liked") user.videos = user.videos.liked;
  else if (query.videos !== "all") delete user.videos;

  res.status(200).json({
    success: true,
    data: user
  });
});
