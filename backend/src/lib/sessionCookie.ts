import { parse, serialize, type SerializeOptions } from "cookie";
import type { Request, Response } from "express";

/** Host-only session cookie. JavaScript on the page cannot read it. */
export const SESSION_COOKIE = "__Host-impact_session";

const MAX_AGE_SECONDS = 60 * 60 * 12;

const baseOptions: SerializeOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

export function readCookieToken(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const value = parse(header)[SESSION_COOKIE];
  return value || undefined;
}

export function readBearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return undefined;
  const token = header.slice(7).trim();
  return token || undefined;
}

export function readAccessToken(req: Request): string | undefined {
  return readBearerToken(req) ?? readCookieToken(req);
}

export function setSessionCookie(res: Response, token: string) {
  res.append(
    "Set-Cookie",
    serialize(SESSION_COOKIE, token, { ...baseOptions, maxAge: MAX_AGE_SECONDS }),
  );
}

export function clearSessionCookie(res: Response) {
  res.append("Set-Cookie", serialize(SESSION_COOKIE, "", { ...baseOptions, maxAge: 0 }));
  res.setHeader("Clear-Site-Data", '"cookies"');
}
