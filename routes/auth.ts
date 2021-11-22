import { Router } from "express";
import { body } from "express-validator";

import { login } from "../controllers/auth";

const router = Router();

router
  .route("/login")
  .post(
    [
      body("username")
        .trim()
        .isLength({ max: 15 })
        .withMessage("Username too long.")
        .isLength({ min: 4 })
        .withMessage("Username too short.")
    ],
    login
  );

export default router;
