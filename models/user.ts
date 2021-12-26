import { Schema, model, SchemaTypes } from "mongoose";

import { Video } from "./video";

interface Notification {
	_id?: string;
	notificationId?: string;
	type: "likedVideo" | "followed" | "commented";
	message: string;
	by: User | string; // followed by or liked by etc
	createdAt: Date | number;
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
	extends Omit<User, "followers" | "following" | "videos"> {
	num?: number;
	followers?: number | User[];
	following?: number | User[];
	isFollowing?: boolean;
	videos?: Video[];
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
	by: {
		...RefType("User"),
		required: true
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
