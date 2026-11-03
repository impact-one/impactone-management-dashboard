import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { initStore, recordAudit, store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { rememberSession } from "../../lib/sessions.js";
import { toPublicUser } from "../../middleware/authenticate.js";

const dummyHash = "$2a$10$hl0Yqbt1M97LKIZQ3luERu2H5.6UKIoMqB.dd3H1MV8GOl90ENo.m";

export class AuthService {
  async login(email: string, password: string) {
    await initStore();
    const user = store.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
    if (!user || !matches) {
      recordAudit({
        actorEmail: email.toLowerCase(),
        role: "anonymous",
        method: "POST",
        path: "/api/auth/login",
        status: 401,
        action: "login_failed",
      });
      throw new AppError(401, "Email or password is incorrect.");
    }
    const sessionId = randomUUID();
    rememberSession(sessionId);
    const token = jwt.sign({ sub: user.id, jti: sessionId }, env.jwtSecret, { expiresIn: 60 * 60 * 12 });
    return { token, user: toPublicUser(user) };
  }
}

export const authService = new AuthService();
