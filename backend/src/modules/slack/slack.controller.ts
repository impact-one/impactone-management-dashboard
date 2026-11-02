import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { slackService } from "./slack.service.js";

function writes() {
  return { liveWritesEnabled: Boolean(env.slackBotToken && env.slackChannelId) };
}

export class SlackController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await slackService.list(requireUser(req));
    sendData(res, result.items, { note: result.note, ...writes() });
  });

  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await slackService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note, ...writes() });
  });

  post = asyncHandler(async (req: Request, res: Response) => {
    const message = await slackService.post(requireUser(req), req.body);
    sendData(res, message, { note: "Update posted to Slack.", ...writes() });
  });
}

export const slackController = new SlackController();
