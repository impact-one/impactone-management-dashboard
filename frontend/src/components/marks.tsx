import type { ComponentType } from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  FileTextIcon,
  FolderKanbanIcon,
  CameraIcon,
  HardDriveIcon,
  LandmarkIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  MessageSquareIcon,
  Share2Icon,
  SparklesIcon,
  TableIcon,
  UserRoundIcon,
  WorkflowIcon,
} from "lucide-react";

function iconFor(name: string): ComponentType<{ className?: string }> {
  const key = name.toLowerCase();
  if (key.includes("calendar") || key.includes("meeting")) return CalendarDaysIcon;
  if (key.includes("drive")) return HardDriveIcon;
  if (key.includes("slack")) return MessageSquareIcon;
  if (key.includes("sheet") || key.includes("budget")) return TableIcon;
  if (key.includes("make") || key.includes("workflow") || key.includes("automat")) return WorkflowIcon;
  if (key.includes("instagram")) return CameraIcon;
  if (key.includes("social")) return Share2Icon;
  if (key.includes("clickup") || key.includes("task")) return ListTodoIcon;
  if (key.includes("html") || key.includes("dashboard") || key.includes("map")) return LayoutDashboardIcon;
  if (key.includes("document") || key.includes("file")) return FileTextIcon;
  if (key.includes("ai") || key.includes("agent")) return SparklesIcon;
  if (key.includes("king salman") || key.includes("ioc") || key.includes("park")) return LandmarkIcon;
  if (key.includes("cost") || key.includes("estimate") || key.includes("host") || key.includes("licence")) return CircleDollarSignIcon;
  if (key.includes("role") || key.includes("executive") || key.includes("manager") || key.includes("consultant") || key.includes("viewer"))
    return UserRoundIcon;
  if (key.includes("workstream") || key.includes("layer") || key.includes("architect")) return LayersIcon;
  if (key.includes("project") || key.includes("operations")) return BriefcaseIcon;
  return FolderKanbanIcon;
}

export function MarkIcon({ name }: { name: string }) {
  const Icon = iconFor(name);
  return <Icon aria-hidden="true" />;
}
