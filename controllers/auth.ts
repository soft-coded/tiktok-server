import { validationResult } from "express-validator";
import asyncHandler from "express-async-handler";
import { hash, compare } from "bcryptjs";

import { CustomError } from "./error";
import UserModel from "../models/user";

export const login = asyncHandler(async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
  const user = await UserModel.findOne({ username: req.body.username });
  if (!user) throw new CustomError(400, "User does not exist.");
  const passMatches = await compare(req.body.password, user.password);
  if (!passMatches) throw new CustomError(400, "Incorrect password.");

  res.status(200).json({
    success: true,
    username: user.username,
    userId: user._id
  });
});

export const signup = asyncHandler(async (req, res) => {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
  let user = await UserModel.findOne({ username: req.body.username });
  if (user) throw new CustomError(400, "Username already registered.");
  user = await UserModel.findOne({ email: req.body.email });
  if (user) throw new CustomError(400, "Email already registered.");

  delete req.body.confpass; // password confirmation, not needed anymore
  const hashedPassword = await hash(req.body.password, 10);
  user = await UserModel.create({ ...req.body, password: hashedPassword });
  res.status(201).json({
    success: true,
    userId: user._id,
    username: user.username
  });
});
