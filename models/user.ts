import { Schema, model, SchemaTypes } from "mongoose";

import { Video } from "./video";

export interface Notification {
	_id?: string;
	notificationId?: string;
	type: "likedVideo" | "followed" | "commented" | "replied";
	message: string;
	refId: User | Video | string; // likedVideo id or comment id etc
	by: User | string; // followed by or liked by etc (id only)
	meta?: any; // videoId in case of "commented" or "replied", etc
	read?: boolean;
	createdAt?: Date | number;
}

export interface User {
	_id: string;
	username: string;
	name: string;
	email: string;
	password: string;
	profilePhoto: string;
	description: string;
	videos: {
		uploaded: Video[];
		liked: Video[];
	};
	totalLikes: number;
	following: User[];
	followers: User[];
	interestedIn: string[];
	notifications: Notification[];
	createdAt: Date | number;
}

export interface ExtendedUser
	extends Omit<User, "followers" | "following" | "videos" | "notifications"> {
	num?: number;
	followers?: number | User[];
	following?: number | User[];
	isFollowing?: boolean;
	notifications?: any;
	videos?: Video[] | User["videos"];
	save?: any;
}

export const RefType = (ref: string) => ({
	type: SchemaTypes.ObjectId,
	ref
});

const NotificationSchema = new Schema<Notification>({
	type: {
		type: String,
		required: true
	},
	message: {
		type: String,
		required: true
	},
	refId: {
		type: SchemaTypes.ObjectId,
		required: true
	},
	by: {
		...RefType("User"),
		required: true
	},
	meta: {},
	read: {
		type: Boolean,
		default: false
	},
	createdAt: {
		type: Date,
		default: Date.now,
		immutable: true
	}
});

export default model<User>(
	"User",
	new Schema<User>({
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
			uploaded: [RefType("Video")],
			liked: [RefType("Video")]
		},
		totalLikes: {
			type: Number,
			default: 0
		},
		following: [RefType("User")],
		followers: [RefType("User")],
		interestedIn: [String], // array of tags, for recommendations
		notifications: [NotificationSchema],
		createdAt: {
			type: Date,
			default: Date.now,
			immutable: true
		}
	})
);
