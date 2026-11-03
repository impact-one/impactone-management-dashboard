import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  aiTools,
  automations,
  budget,
  catalogTools,
  consultants,
  dataSources,
  DEMO_PASSWORD,
  documents,
  driveFiles,
  followUps,
  meetings,
  milestones,
  sharedCalendars,
  projects,
  tasks,
  userSeeds,
} from "./seed.js";
import type { AuditEvent, Role, StoredUser } from "../types/domain.js";

class Store {
  users: StoredUser[] = [];
  projects = projects;
  tasks = tasks;
  documents = documents;
  driveFiles = structuredClone(driveFiles);
  followUps = followUps;
  milestones = milestones;
  consultants = consultants;
  budget = budget;
  aiTools = aiTools;
  automations = automations;
  catalogTools = catalogTools;
  dataSources = dataSources;
  meetings = structuredClone(meetings);
  calendars = structuredClone(sharedCalendars);
  audit: AuditEvent[] = [];
  ready = false;
}

export const store = new Store();

let starting: Promise<void> | undefined;

export function initStore() {
  starting ??= loadStore();
  return starting;
}

async function loadStore() {
  if (store.ready) return;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  store.users = userSeeds.map((user) => ({ ...user, passwordHash }));
  store.ready = true;
}

export function recordAudit(event: {
  actorEmail: string;
  role: Role | "anonymous";
  method: string;
  path: string;
  status: number;
  action: string;
}) {
  store.audit.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    ...event,
  });
  if (store.audit.length > 300) store.audit.length = 300;
}
