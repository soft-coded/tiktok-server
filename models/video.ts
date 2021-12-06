import { Schema, model } from "mongoose";

import { RefType, User } from "./user";

interface Comment {
	_id: string;
	commentId?: string;
	postedBy: User;
	comment: string;
	createdAt: Date | number;
	likes: User[];
	replies?: Comment[];
}

export interface Video {
	_id: string;
	uploader: User;
	video: string;
	music: string;
	caption: string;
	tags: string[];
	likes: User[];
	comments: Comment[];
	shares: number;
	views: number;
	createdAt: Date | number;
}

export interface ExtendedVideo extends Video {
	videoId?: string;
	hasLiked?: boolean;
}

const reply = {
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
		default: Date.now,
		immutable: true
	},
	likes: [RefType("User")]
};

const ReplySchema = new Schema(reply);

const CommentSchema = new Schema({
	...reply,
	replies: [ReplySchema] // replies cannot be nested
});

export default model<Video>(
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
		music: String,
		caption: {
			type: String,
			required: true
		},
		tags: {
			type: [String], // used for recommendations
			required: true
		},
		likes: [RefType("User")],
		comments: [CommentSchema],
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
			default: Date.now,
			immutable: true
		}
	})
);
