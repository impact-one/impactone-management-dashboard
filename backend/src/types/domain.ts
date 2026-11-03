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

export type DriveRole = "owner" | "writer" | "commenter" | "reader";
export type DriveKind = "folder" | "document" | "spreadsheet" | "file";

export interface DriveShare {
  email: string;
  role: DriveRole;
}

export interface DriveFile {
  id: string;
  title: string;
  kind: DriveKind;
  folderId: string | null;
  folderName: string;
  owner: string;
  ownerEmail: string;
  href: string | null;
  projectId: string | null;
  projectName: string;
  accessRole: DriveRole;
  shares: DriveShare[];
  source: DataSource;
  reviewFlags: string[];
}

export interface DriveDesk {
  connected: boolean;
  canManage: boolean;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  steps: OperatingModelStep[];
  files: DriveFile[];
  known: DocumentItem[];
  projects: { id: string; name: string }[];
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

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  author: string;
  postedAt: string;
  source: DataSource;
  href: string | null;
}

export interface SlackDesk {
  connected: boolean;
  canPost: boolean;
  channelId: string | null;
  channelName: string;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  steps: { name: string; detail: string }[];
  messages: SlackMessage[];
}

export type AssistantWorkflow = "draft" | "research" | "analyze" | "brainstorm" | "summarize";

export interface AssistantDesk {
  connected: boolean;
  canRun: boolean;
  model: string | null;
  provider: "ChatGPT";
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  workflows: { id: AssistantWorkflow; label: string; hint: string }[];
  safeguards: string[];
}

export interface AssistantRun {
  workflow: AssistantWorkflow;
  model: string;
  output: string;
  reviewNote: string;
  origin: "live";
}

export type ClaudeWorkflow = "write" | "review" | "synthesize" | "code";

export interface ClaudeDesk {
  connected: boolean;
  canRun: boolean;
  model: string | null;
  provider: "Claude";
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  workflows: { id: ClaudeWorkflow; label: string; hint: string }[];
  safeguards: string[];
}

export interface ClaudeRun {
  workflow: ClaudeWorkflow;
  model: string;
  output: string;
  reviewNote: string;
  origin: "live";
}

export interface OtterPerson {
  name: string;
  email: string | null;
}

export interface OtterShare {
  name: string;
  email: string | null;
  permission: string;
  kind: "person" | "channel";
  discoverability: string | null;
}

export interface OtterActionItem {
  id: string;
  text: string;
  assignee: string | null;
  completed: boolean;
}

export interface OtterInsight {
  topic: string;
  points: string[];
}

export interface OtterMeeting {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  transcriptTruncated: boolean;
  createdAt: string;
  owner: string;
  url: string | null;
  joinUrl: string | null;
  guests: OtterPerson[];
  shares: OtterShare[];
  actionItems: OtterActionItem[];
  insights: OtterInsight[];
  summaryStatus: string | null;
  actionStatus: string | null;
  source: DataSource;
}

export interface OtterConsentCheck {
  id: string;
  label: string;
}

export interface OtterDesk {
  connected: boolean;
  canRead: boolean;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  consentStatement: string;
  consentChecks: OtterConsentCheck[];
  steps: { name: string; detail: string }[];
  meetings: OtterMeeting[];
}

export interface IntegrationStatus {
  id: string;
  name: string;
  mode: "read-only" | "schedule" | "library" | "channel" | "assistant" | "meetings" | "not-connected";
  configured: boolean;
  origin: Origin;
  detail: string;
  limitation: string | null;
  lastCheckedAt: string | null;
}
