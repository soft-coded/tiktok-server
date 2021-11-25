import { Schema, model } from "mongoose";

import { RefType } from "./user";

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
		default: Date.now
	},
	likes: [RefType("User")]
};

const ReplySchema = new Schema(reply);

const CommentSchema = new Schema({
	...reply,
	replies: [ReplySchema] // replies cannot be nested
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
			default: Date.now
		}
	})
);
