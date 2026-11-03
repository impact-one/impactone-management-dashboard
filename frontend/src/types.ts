export type Origin = "live" | "sample" | "documented" | "needs-review";
export type Role = "executive" | "manager" | "consultant" | "viewer";

export interface Permissions {
  viewBudget: boolean;
  viewBudgetAmounts: boolean;
  viewConsultantFees: boolean;
  viewAudit: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  assignedProjectIds: string[];
  permissions: Permissions;
}

export interface Envelope<T> {
  data: T;
  meta: {
    liveWritesEnabled: boolean;
    note?: string;
  };
}

export interface DataSource {
  origin: Origin;
  system: string;
  detail: string;
}

export interface Workstream {
  id: string;
  name: string;
  owner: string;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  organisation: string;
  owner: string;
  status: string;
  summary: string;
  source: DataSource;
  reviewFlags: string[];
  workstreams: Workstream[];
}

export interface Task {
  id: string;
  projectId: string | null;
  projectName: string;
  title: string;
  owner: string;
  responsibility: string;
  status: string;
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
  steps: { name: string; detail: string }[];
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
  status: string;
  dueDate: string | null;
  source: DataSource;
}

export interface Milestone {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  owner: string;
  status: string;
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
  status: string;
  feeAmount: number | null;
  currency: string;
  source: DataSource;
  reviewFlags: string[];
}

export interface Budget {
  id: string;
  name: string;
  currency: string;
  source: DataSource;
  lines: { id: string; category: string; amount: number | null; note: string }[];
  total: number | null;
  warnings: string[];
}

export interface AiTool {
  id: string;
  name: string;
  kind: string;
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

export interface AvailabilityReport {
  timeZone: string;
  windowStart: string;
  windowEnd: string;
  clear: boolean;
  people: { email: string; busy: { start: string; end: string; title: string | null }[]; warning: string | null }[];
}

export interface CalendarDesk {
  connected: boolean;
  timeZone: string;
  canSchedule: boolean;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  steps: { name: string; detail: string }[];
  calendars: SharedCalendar[];
  meetings: Meeting[];
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

export interface OtterDesk {
  connected: boolean;
  canRead: boolean;
  bestFit: string;
  implementationNote: string;
  operatingModel: string;
  consentStatement: string;
  consentChecks: { id: string; label: string }[];
  steps: { name: string; detail: string }[];
  meetings: OtterMeeting[];
}

export interface IntegrationStatus {
  id: string;
  name: string;
  mode: string;
  configured: boolean;
  origin: Origin;
  detail: string;
  limitation: string | null;
  lastCheckedAt: string | null;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorEmail: string;
  role: string;
  method: string;
  path: string;
  status: number;
  action: string;
}

export interface DashboardData {
  counts: {
    projects: number;
    openTasks: number;
    deadlinesThisWeek: number;
    openFollowUps: number;
    aiNeedsReview: number;
  };
  projects: Project[];
  deadlines: Task[];
  followUps: FollowUp[];
  meetings: Meeting[];
  integrations: { id: string; name: string; origin: Origin; detail: string }[];
  taskNote: string;
  meetingNote: string;
}

export interface ProjectDetail {
  project: Project;
  tasks: Task[];
  teamLiveTasks: Task[];
  documents: DocumentItem[];
  teamLiveDocuments: DocumentItem[];
  followUps: FollowUp[];
  milestones: Milestone[];
  consultants: Consultant[];
  taskNote: string;
  documentNote: string;
}

export interface AiCatalog {
  tools: AiTool[];
  agents: never[];
  agentNote: string;
}

export interface SystemMap {
  tools: CatalogTool[];
  flows: AutomationFlow[];
  dataSources: DataSourceRecord[];
  agents: never[];
  agentNote: string;
}

export interface Proposal {
  assumptions: string[];
  architecture: { title: string; detail: string }[];
  accessModel: { role: string; access: string }[];
  libreChat: { verdict: string; points: string[] };
  costs: { name: string; estimate: string; note: string }[];
  nextStage: string[];
  risks: string[];
}
