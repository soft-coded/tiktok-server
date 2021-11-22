import { Request, Response } from "express";
import { validationResult } from "express-validator";

import { CustomError } from "./error";

export function login(req: Request, res: Response) {
  const vRes = validationResult(req);
  if (!vRes.isEmpty()) {
    throw new CustomError(400, vRes.array({ onlyFirstError: true })[0].msg);
  }
}
