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

export const RefType = (ref: string) => ({
  type: SchemaTypes.ObjectId,
  ref
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
      type: String, // filename of the photo in the public/profile-photos folder
      default: "default.png"
    },
    description: {
      type: String,
      default: "No bio yet."
    },
    videos: {
      uploaded: ListType(RefType("Video")),
      liked: ListType(RefType("Video"))
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    following: ListType(RefType("User")),
    followers: ListType(RefType("User")),
    interestedIn: ListType(String), // array of tags, for recommendations
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  })
);
