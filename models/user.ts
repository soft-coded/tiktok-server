import { Schema, model, SchemaTypes } from "mongoose";

export interface UserType {
  userId?: string;
  id?: string;
  username: string;
  name?: string;
  email?: string;
  password?: string;
  profilePhoto?: string;
  description?: string;
  videos?: {
    uploaded?: string[];
    liked?: string[];
  };
  totalLikes?: number;
  following?: string[];
  followers?: string[];
}

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
      default: "/profile-photos/default.png" // path to default profile photo
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
