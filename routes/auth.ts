import { Router } from "express";
import { body } from "express-validator";

import { login, signup } from "../controllers/auth";

const router = Router();

router
  .route("/login")
  .post(
    body("username")
      .trim()
      .isLength({ max: 15 })
      .withMessage("Username too long.")
      .isLength({ min: 4 })
      .withMessage("Username too short."),
    body("password")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password too short."),
    login
  );

router.route("/signup").post(
  body("username")
    .trim()
    .isLength({ max: 15 })
    .withMessage("Username too long.")
    .isLength({ min: 4 })
    .withMessage("Username too short."),
  body("email").trim().isEmail().withMessage("Invalid email."),
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required."),
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password too short."),
  body("confpass")
    .trim()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match."),
  signup
);

export default router;
