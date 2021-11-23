import { Schema, model, SchemaTypes } from "mongoose";

import { ListType } from "./user";

const CommentType = {
  postedBy: {
    type: SchemaTypes.ObjectId, // references a user from users collection
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  postedTime: {
    type: Date,
    required: true
  },
  likes: ListType(SchemaTypes.ObjectId)
};

const CommentSchema = new Schema({
  ...CommentType,
  replies: ListType(CommentType)
});

export default model(
  "Video",
  new Schema({
    uploader: {
      type: SchemaTypes.ObjectId,
      required: true
    },
    video: {
      type: String, // path to the video in the public/uploads folder
      required: true
    },
    caption: String,
    music: String,
    tags: [String],
    likes: ListType(SchemaTypes.ObjectId), // references userId from users collection
    comments: ListType(CommentSchema)
  })
);
