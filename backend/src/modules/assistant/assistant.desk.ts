import { findConfidential } from "./assistant.guard.js";
import { automationsService } from "../automations/automations.service.js";
import { calendarService } from "../calendar/calendar.service.js";
import { TEAM_TIME_ZONE } from "../calendar/calendar.time.js";
import { dashboardService } from "../dashboard/dashboard.service.js";
import { documentsService } from "../documents/documents.service.js";
import { followUpsService } from "../follow-ups/follow-ups.service.js";
import { projectsService } from "../projects/projects.service.js";
import { slackService } from "../slack/slack.service.js";
import { tasksService } from "../tasks/tasks.service.js";
import type { Meeting, Origin, PublicUser, SlackMessage, Task, TaskComment } from "../../types/domain.js";
import type { DeskLookup } from "./assistant.intent.js";

export type DeskAnswer = {
  text: string;
  origin: "live" | "sample";
};

const REFUSAL =
  "I can't post to Slack, book a meeting, create a task, or change access from this chat. I can draft the text, or explain the workflows this desk already lists.";

export function refusalAnswer(): DeskAnswer {
  return { text: REFUSAL, origin: "live" };
}

export function formatNextMeeting(meetings: Meeting[], now = new Date()): DeskAnswer {
  const next = meetings
    .filter((meeting) => {
      const end = meeting.endsAt ?? meeting.startsAt;
      return Boolean(meeting.startsAt && end && new Date(end).getTime() > now.getTime());
    })
    .sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime())[0];

  if (!next?.startsAt) {
    return {
      text: "There is no upcoming meeting on the calendar. Meetings with no start time are not counted.",
      origin: "live",
    };
  }

  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: TEAM_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(next.startsAt));
  const where = [next.calendarName, next.location].filter(Boolean).join(", ");
  const origin = runOrigin(next.source.origin);
  return {
    text: `Your next meeting is “${next.title}” on ${when} (${TEAM_TIME_ZONE})${where ? `, ${where}` : ""}. Time on the event: ${next.timeLabel}. This is ${origin === "sample" ? "sample" : "live"} calendar data.`,
    origin,
  };
}

export function formatNewMessage(input: {
  slack: SlackMessage | null;
  comment: { taskTitle: string; comment: TaskComment; origin: Origin } | null;
}): DeskAnswer {
  const slackAt = input.slack ? Date.parse(input.slack.postedAt) : NaN;
  const commentAt = input.comment?.comment.postedAt ? Date.parse(input.comment.comment.postedAt) : NaN;
  const slackNewer = Number.isFinite(slackAt) && (!Number.isFinite(commentAt) || slackAt >= commentAt);
  const commentNewer = Number.isFinite(commentAt) && !slackNewer;

  if (slackNewer && input.slack) {
    const origin = runOrigin(input.slack.source.origin);
    return {
      text: `The latest message is in Slack #${input.slack.channelName}, from ${input.slack.author} (${origin === "sample" ? "sample" : "live"}): ${clip(input.slack.text)}`,
      origin,
    };
  }
  if (commentNewer && input.comment) {
    const origin = runOrigin(input.comment.origin);
    const author = input.comment.comment.author || "someone";
    return {
      text: `The latest message is a ClickUp comment on “${input.comment.taskTitle}”, from ${author} (${origin === "sample" ? "sample" : "live"}): ${clip(input.comment.comment.text)}`,
      origin,
    };
  }
  if (input.slack) {
    const origin = runOrigin(input.slack.source.origin);
    return {
      text: `The latest Slack message in #${input.slack.channelName} is from ${input.slack.author} (${origin === "sample" ? "sample" : "live"}): ${clip(input.slack.text)}`,
      origin,
    };
  }
  return { text: "There is no Slack message or ClickUp comment to show.", origin: "live" };
}

export function formatAutomations(): string {
  return automationsService
    .list()
    .map((flow) => {
      const steps = flow.steps.map((step) => `${step.name} (${step.state}): ${clip(step.note, 160)}`).join("; ");
      return `${flow.title}. ${clip(flow.summary, 240)} Steps: ${steps}`;
    })
    .join("\n");
}

export async function answerLookup(
  user: PublicUser,
  lookup: DeskLookup,
  options: { latest?: boolean; mine?: boolean; person?: string } = {},
): Promise<DeskAnswer> {
  if (lookup === "meeting") {
    const listed = await calendarService.list(user);
    return formatNextMeeting(listed.items);
  }
  if (lookup === "message") return answerMessage(user);
  if (lookup === "tasks") return answerTasks(user, options);
  if (lookup === "projects") return answerProjects(user);
  if (lookup === "documents") return answerDocuments(user);
  if (lookup === "followUps") return answerFollowUps(user);
  return answerDashboard(user);
}

async function answerMessage(user: PublicUser): Promise<DeskAnswer> {
  const slack = await slackService.list(user);
  const tasks = await tasksService.list(user);
  const newest = [...tasks.items].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  let comment: { taskTitle: string; comment: TaskComment; origin: Origin } | null = null;
  if (newest) {
    const full = await tasksService.get(user, newest.id);
    const latest = [...(full?.comments ?? [])].sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))[0];
    if (latest?.text) comment = { taskTitle: newest.title, comment: latest, origin: (full ?? newest).source.origin };
  }
  const slackMessage = [...slack.items].sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0] ?? null;
  return formatNewMessage({ slack: slackMessage, comment });
}

async function answerTasks(
  user: PublicUser,
  options: { latest?: boolean; mine?: boolean; person?: string },
): Promise<DeskAnswer> {
  const listed = await tasksService.list(user);
  const open = listed.items.filter((task) => !task.closed);
  const mine = options.mine ? open.filter((task) => belongsTo(task, options.person)) : open;
  const pool = options.mine ? mine : open;
  if (options.latest) {
    const task = [...pool].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
    if (!task) {
      const whose = options.mine ? "assigned to you" : "on the desk";
      return { text: `There is no open task ${whose}.`, origin: "live" };
    }
    const origin = runOrigin(task.source.origin);
    const due = task.dueDate ? `due ${task.dueDate}` : "no due date";
    const updated = task.updatedAt ? ` Updated ${task.updatedAt.slice(0, 10)}.` : "";
    return {
      text: `Your latest task is “${task.title}” — ${task.status} — ${due} — ${task.owner || "unassigned"}${task.projectName ? ` — ${task.projectName}` : ""}.${updated} This is ${origin === "sample" ? "sample" : "live"} task data.`,
      origin,
    };
  }
  if (pool.length === 0) {
    return { text: options.mine ? "You have no open tasks assigned to you." : "There are no open tasks on the desk.", origin: "live" };
  }
  const lines = pool.slice(0, 8).map((task) => taskLine(task));
  return {
    text: `${options.mine ? "Your open tasks" : "Open tasks"} (${listed.note}):\n${lines.join("\n")}`,
    origin: runOrigin(pool[0]?.source.origin ?? "live"),
  };
}

function belongsTo(task: Task, person?: string) {
  if (!person) return false;
  const owner = task.owner.trim().toLowerCase();
  const name = person.trim().toLowerCase();
  if (!owner || !name) return false;
  return owner === name || owner.includes(name) || name.includes(owner);
}

async function answerProjects(user: PublicUser): Promise<DeskAnswer> {
  const projects = projectsService.list(user).slice(0, 8);
  if (projects.length === 0) return { text: "There are no projects you can see.", origin: "live" };
  const lines = projects.map((project) => `- ${project.name} — ${project.owner} — ${project.status}`);
  return { text: `Projects:\n${lines.join("\n")}`, origin: runOrigin(projects[0]?.source.origin ?? "live") };
}

async function answerDocuments(user: PublicUser): Promise<DeskAnswer> {
  const listed = await documentsService.list(user);
  const items = listed.items.slice(0, 8);
  if (items.length === 0) return { text: "There are no documents on the desk.", origin: "live" };
  const lines = items.map((item) => `- ${item.title}${item.href ? ` — ${item.href}` : ""}`);
  return {
    text: `Documents (names and links only):\n${lines.join("\n")}`,
    origin: runOrigin(items[0]?.source.origin ?? "live"),
  };
}

async function answerFollowUps(user: PublicUser): Promise<DeskAnswer> {
  const open = followUpsService.list(user).filter((item) => item.status === "open").slice(0, 8);
  if (open.length === 0) return { text: "There are no open follow-ups.", origin: "live" };
  const lines = open.map((item) => `- ${item.title} — ${item.owner}${item.dueDate ? ` — due ${item.dueDate}` : ""}`);
  return { text: `Open follow-ups:\n${lines.join("\n")}`, origin: runOrigin(open[0]?.source.origin ?? "live") };
}

async function answerDashboard(user: PublicUser): Promise<DeskAnswer> {
  const [dashboard, slack, documents, calendar] = await Promise.all([
    dashboardService.get(user),
    slackService.list(user),
    documentsService.list(user),
    calendarService.list(user),
  ]);
  const meeting = formatNextMeeting(calendar.items);
  const latest = [...slack.items].sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0];
  const slackLine = latest
    ? `Latest Slack message in #${latest.channelName} (${runOrigin(latest.source.origin)}): ${clip(latest.text, 180)}`
    : "No Slack message is available.";
  const docs = documents.items
    .slice(0, 5)
    .map((item) => item.title)
    .join(", ");
  return {
    text: [
      `Projects: ${dashboard.counts.projects}. Open tasks: ${dashboard.counts.openTasks}. Deadlines in the next 7 days: ${dashboard.counts.deadlinesThisWeek}. Open follow-ups: ${dashboard.counts.openFollowUps}.`,
      meeting.text,
      slackLine,
      docs ? `Documents: ${docs}.` : "No documents are listed.",
    ].join("\n"),
    origin: meeting.origin,
  };
}

function taskLine(task: Task) {
  const due = task.dueDate ? `due ${task.dueDate}` : "no due date";
  return `- ${task.title} — ${task.status} — ${due} — ${task.owner || "unassigned"}`;
}

function clip(text: string, max = 280) {
  const clean = findConfidential(text) ? "[removed]" : text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function runOrigin(origin: Origin): "live" | "sample" {
  return origin === "sample" ? "sample" : "live";
}
