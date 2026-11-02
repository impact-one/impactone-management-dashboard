import type { Request, Response } from "express";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { clearSessionCookie, readAccessToken, setSessionCookie } from "../../lib/sessionCookie.js";
import { attachUserIfPresent, revokePresentedToken } from "../../middleware/jwt.js";
import { loginSchema } from "./auth.schema.js";
import { authService } from "./auth.service.js";

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Enter a valid email and a password of at least 8 characters.");
    }
    const session = await authService.login(parsed.data.email, parsed.data.password);
    setSessionCookie(res, session.token);
    req.user = session.user;
    sendData(res, { user: session.user });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    sendData(res, requireUser(req));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    attachUserIfPresent(req);
    const token = readAccessToken(req);
    if (token) revokePresentedToken(token);
    clearSessionCookie(res);
    sendData(res, { signedOut: true });
  });
}

export const authController = new AuthController();
