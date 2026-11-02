import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { calendarService } from "./calendar.service.js";

function writes() {
  return { liveWritesEnabled: Boolean(env.googleAccessToken) };
}

function routeId(req: Request) {
  return typeof req.params.id === "string" ? req.params.id : "";
}

export class CalendarController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await calendarService.list(requireUser(req));
    sendData(res, result.items, { note: result.note, ...writes() });
  });

  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await calendarService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note, ...writes() });
  });

  schedule = asyncHandler(async (req: Request, res: Response) => {
    const meeting = await calendarService.schedule(requireUser(req), req.body);
    sendData(res, meeting, { note: "Meeting scheduled.", ...writes() });
  });

  invitations = asyncHandler(async (req: Request, res: Response) => {
    const meeting = await calendarService.updateInvitations(requireUser(req), routeId(req), req.body);
    sendData(res, meeting, { note: "Invitations updated.", ...writes() });
  });

  availability = asyncHandler(async (req: Request, res: Response) => {
    const report = await calendarService.availability(requireUser(req), req.body);
    sendData(res, report, { ...writes() });
  });

  share = asyncHandler(async (req: Request, res: Response) => {
    const calendar = await calendarService.share(requireUser(req), routeId(req), req.body);
    sendData(res, calendar, { note: "Sharing updated.", ...writes() });
  });

  unshare = asyncHandler(async (req: Request, res: Response) => {
    const calendar = await calendarService.unshare(requireUser(req), routeId(req), req.body);
    sendData(res, calendar, { note: "Sharing removed.", ...writes() });
  });
}

export const calendarController = new CalendarController();
