import { Router } from "express";
import { jwtMiddleware } from "../../middleware/jwt.js";
import { authController } from "./auth.controller.js";
import { loginRateLimit } from "./loginRateLimit.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", jwtMiddleware, authController.me);
