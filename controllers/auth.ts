import asyncHandler from "express-async-handler";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

import { CustomError } from "../utils/error";
import { successRes } from "../utils/success";
import UserModel from "../models/user";

export const login = asyncHandler(async (req, res) => {
	const user = (await UserModel.findOne(
		{ username: req.body.username },
		"username password"
	))!;
	const passMatches = await compare(req.body.password, user.password);
	if (!passMatches) throw new CustomError(400, "Incorrect password");

	const token = sign(user.username, process.env.TOKEN_SECRET!);

	res.status(200).json(successRes({ username: user.username, token }));
});

export const signup = asyncHandler(async (req, res) => {
	let user: any = await UserModel.exists({
		username: new RegExp(req.body.username, "i")
	});
	if (user) throw new CustomError(400, "Username already registered");

	user = await UserModel.exists({ email: req.body.email });
	if (user) throw new CustomError(400, "Email already registered");

	delete req.body.confpass; // password confirmation, not needed anymore
	const hashedPassword = await hash(req.body.password, 10);
	user = await UserModel.create({ ...req.body, password: hashedPassword });
	const token = sign(user.username, process.env.TOKEN_SECRET!);

	res.status(201).json(successRes({ username: user.username, token }));
});
