import { store } from "../../data/store.js";
import { countStatuses, isTaskClosed } from "../../lib/taskStatus.js";
import type { PublicUser } from "../../types/domain.js";
import { calendarService } from "../calendar/calendar.service.js";
import { followUpsService } from "../follow-ups/follow-ups.service.js";
import { integrationsService } from "../integrations/integrations.service.js";
import { projectsService } from "../projects/projects.service.js";
import { tasksService } from "../tasks/tasks.service.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export class DashboardService {
  async get(user: PublicUser) {
    const [taskResult, meetingResult, integrations] = await Promise.all([
      tasksService.list(user),
      calendarService.list(user),
      integrationsService.list(),
    ]);
    const projects = projectsService.list(user);
    const followUps = followUpsService.list(user).filter((item) => item.status === "open");
    const openTasks = taskResult.items.filter((task) => !isTaskClosed(task));
    const horizon = addDays(todayISO(), 7);
    const deadlines = openTasks
      .filter((task) => task.dueDate && task.dueDate <= horizon)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

    return {
      counts: {
        projects: projects.length,
        openTasks: openTasks.length,
        deadlinesThisWeek: deadlines.length,
        openFollowUps: followUps.length,
        meetings: meetingResult.items.length,
        aiNeedsReview: store.aiTools.filter((tool) => tool.source.origin === "needs-review" || tool.reviewFlags.length > 0).length,
      },
      statuses: countStatuses(taskResult.items, taskResult.statuses),
      projects,
      deadlines,
      followUps: followUps.slice(0, 5),
      meetings: meetingResult.items.slice(0, 4),
      integrations: integrations.map((item) => ({
        id: item.id,
        name: item.name,
        origin: item.origin,
        detail: item.detail,
      })),
      taskNote: taskResult.note,
      meetingNote: meetingResult.note,
    };
  }
}

export const dashboardService = new DashboardService();
