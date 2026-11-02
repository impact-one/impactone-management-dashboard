import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { calendarService } from "./calendar.service.js";

export class CalendarController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await calendarService.list(requireUser(req));
    sendData(res, result.items, { note: result.note });
  });
}

export const calendarController = new CalendarController();
