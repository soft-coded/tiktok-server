import { Schema, model, SchemaTypes } from "mongoose";

export const ListType = (listType: any) => ({
  type: [listType],
  default: []
});

export default model(
  "User",
  new Schema({
    username: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    profilePhoto: {
      type: String, // path to the photo in the public/profile-photos folder
      default: "" // !!!! change to the path of default pfp later !!!!
    },
    description: {
      type: String,
      default: "No bio yet."
    },
    videos: {
      uploaded: ListType(SchemaTypes.ObjectId), // references a video from the videos collection
      liked: ListType(SchemaTypes.ObjectId) // references a video from the videos collection
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    following: ListType(SchemaTypes.ObjectId), // references other users
    followers: ListType(SchemaTypes.ObjectId) // references other users
  })
);
