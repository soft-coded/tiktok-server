import { Schema, model, SchemaType } from "mongoose";

import { RefType, User } from "./user";

interface Reply {
	_id?: string;
	replyId?: string;
	comment: string;
	postedBy: User;
	createdAt: Date | number;
	likes: User[] | number;
	hasLiked?: boolean;
}

interface Comment extends Omit<Reply, "replyId"> {
	commentId?: string;
	replies?: Reply[];
	hasLiked?: boolean;
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

export interface ExtendedVideo
	extends Omit<Video, "comments" | "_id" | "likes"> {
	_id?: string;
	num?: number;
	videoId?: string;
	hasLiked?: boolean;
	comments?: any;
	likes?: number | User[];
	save?: any;
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

const ReplySchema = new Schema<Comment>(reply);

const CommentSchema = new Schema<Comment>({
	...reply,
	replies: [ReplySchema] // replies cannot be nested
});

export default model<Video>(
	"Video",
	new Schema<Video>({
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
