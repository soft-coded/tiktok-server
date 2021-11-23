import { Request, Response } from "express";
import { validationResult } from "express-validator";

import { CustomError } from "./error";
import UserModel from "../models/user";

export async function login(req: Request, res: Response) {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);

  const findRes = await UserModel.findOne({ username: req.body.username });
  if (!findRes) throw new CustomError(400, "Username already registered.");
}

export async function signup(req: Request, res: Response) {
  const vRes = validationResult(req);
  if (!vRes.isEmpty())
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);

  const findRes = await UserModel.findOne({ username: req.body.username });
  if (findRes) throw new CustomError(400, "Username already registered.");
}
