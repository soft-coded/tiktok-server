import { Schema, model } from "mongoose";

import { ListType, RefType } from "./user";

const CommentType = {
  postedBy: {
    ...RefType("User"),
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  likes: ListType(RefType("User"))
};

const CommentSchema = new Schema({
  ...CommentType,
  replies: ListType(CommentType)
});

export default model(
  "Video",
  new Schema({
    uploader: {
      ...RefType("User"),
      required: true
    },
    video: {
      type: String, // filename of the video in the public/uploads folder
      required: true
    },
    caption: String,
    music: String,
    tags: [String],
    likes: ListType(RefType("User")),
    comments: ListType(CommentSchema),
    shares: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  })
);
