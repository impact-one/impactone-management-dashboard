export type Role = "executive" | "manager" | "consultant" | "viewer";

export type Origin = "live" | "sample" | "documented" | "needs-review";

export type TaskStatus = "open" | "in-progress" | "done" | "blocked";

export type WorkStatus = "active" | "in-progress" | "planned" | "needs-review";

export interface DataSource {
  origin: Origin;
  system: string;
  detail: string;
}

export interface Permissions {
  viewBudget: boolean;
  viewBudgetAmounts: boolean;
  viewConsultantFees: boolean;
  viewAudit: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  assignedProjectIds: string[];
  permissions: Permissions;
}

export interface StoredUser extends Omit<PublicUser, "permissions"> {
  passwordHash: string;
}

export interface Workstream {
  id: string;
  name: string;
  owner: string;
  status: WorkStatus;
}

export interface Project {
  id: string;
  name: string;
  organisation: "Impact One" | "IOC";
  owner: string;
  status: "active" | "in-preparation" | "planned";
  summary: string;
  source: DataSource;
  reviewFlags: string[];
  visibleTo: Role[];
  workstreams: Workstream[];
}

export interface Task {
  id: string;
  projectId: string | null;
  projectName: string;
  title: string;
  owner: string;
  responsibility: string;
  status: TaskStatus;
  dueDate: string | null;
  source: DataSource;
  href: string | null;
}

export interface DocumentItem {
  id: string;
  projectId: string | null;
  projectName: string;
  title: string;
  owner: string;
  source: DataSource;
  href: string | null;
  reviewFlags: string[];
}

export interface FollowUp {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  owner: string;
  status: "open" | "done";
  dueDate: string | null;
  source: DataSource;
}

export interface Milestone {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  owner: string;
  status: WorkStatus;
  targetDate: string | null;
  source: DataSource;
  reviewFlags: string[];
}

export interface Consultant {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  scope: string;
  status: WorkStatus;
  feeAmount: number | null;
  currency: "SAR";
  source: DataSource;
  reviewFlags: string[];
}

export interface BudgetLine {
  id: string;
  category: string;
  amount: number | null;
  note: string;
}

export interface Budget {
  id: string;
  name: string;
  currency: "SAR";
  source: DataSource;
  lines: BudgetLine[];
  total: number | null;
  warnings: string[];
}

export interface AiTool {
  id: string;
  name: string;
  kind: "tool" | "automation" | "proposed";
  purpose: string;
  owner: string;
  connections: string;
  source: DataSource;
  reviewFlags: string[];
}

export interface FlowStep {
  name: string;
  state: Origin;
  note: string;
}

export interface AutomationFlow {
  id: string;
  title: string;
  owner: string;
  summary: string;
  source: DataSource;
  steps: FlowStep[];
  reviewFlags: string[];
}

export interface CatalogTool {
  id: string;
  name: string;
  area: string;
  owner: string;
  purpose: string;
  source: DataSource;
  reviewFlags: string[];
}

export interface DataSourceRecord {
  id: string;
  name: string;
  holds: string;
  owner: string;
  usedFor: string;
  source: DataSource;
}

export type CalendarAccess = "owner" | "writer" | "reader" | "freeBusyReader";
export type InvitationResponse = "needsAction" | "accepted" | "declined" | "tentative";

export interface MeetingInvitation {
  email: string;
  name: string;
  response: InvitationResponse;
  optional: boolean;
}

export interface MeetingReminder {
  method: "email" | "popup";
  minutesBefore: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string | null;
  timeLabel: string;
  owner: string;
  ownerEmail: string;
  source: DataSource;
  href: string | null;
  calendarId: string;
  calendarName: string;
  timeZone: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  invitations: MeetingInvitation[];
  reminders: MeetingReminder[];
}

export interface CalendarShare {
  email: string;
  role: CalendarAccess;
}

export interface SharedCalendar {
  id: string;
  name: string;
  timeZone: string;
  accessRole: CalendarAccess;
  primary: boolean;
  shares: CalendarShare[];
  source: DataSource;
}

export interface BusyBlock {
  start: string;
  end: string;
  title: string | null;
}

export interface AvailabilityPerson {
  email: string;
  busy: BusyBlock[];
  warning: string | null;
}

export interface AvailabilityReport {
  timeZone: string;
  windowStart: string;
  windowEnd: string;
  clear: boolean;
  people: AvailabilityPerson[];
}

export interface OperatingModelStep {
  name: string;
  detail: string;
}

export interface CalendarDesk {
  connected: boolean;
  timeZone: string;
  canSchedule: boolean;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  steps: OperatingModelStep[];
  calendars: SharedCalendar[];
  meetings: Meeting[];
}

export interface AuditEvent {
  id: string;
  at: string;
  actorEmail: string;
  role: Role | "anonymous";
  method: string;
  path: string;
  status: number;
  action: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  mode: "read-only" | "schedule" | "not-connected";
  configured: boolean;
  origin: Origin;
  detail: string;
  limitation: string | null;
  lastCheckedAt: string | null;
}
