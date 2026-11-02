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

export interface Meeting {
  id: string;
  title: string;
  date: string | null;
  timeLabel: string;
  owner: string;
  source: DataSource;
  href: string | null;
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
