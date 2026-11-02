import type { ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LogOutIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  PlugIcon,
  ScrollTextIcon,
  SparklesIcon,
  UsersIcon,
  WaypointsIcon,
} from "lucide-react";
import { useAuth } from "../app/AuthContext";
import { Logo } from "./Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface Item {
  to: string;
  label: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function isItemActive(pathname: string, to: string, end?: boolean) {
  if (end || to === "/") return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SideNav({ groups }: { groups: { id: string; label: string; items: Item[] }[] }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive(pathname, item.to, item.end)}
                      tooltip={item.label}
                      className="[&_svg]:text-primary"
                    >
                      <NavLink to={item.to} end={item.end} onClick={() => setOpenMobile(false)}>
                        <Icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  const groups: { id: string; label: string; items: Item[] }[] = [
    {
      id: "nav-work",
      label: "Work",
      items: [
        { to: "/", label: "Overview", end: true, icon: LayoutDashboardIcon },
        { to: "/projects", label: "Projects", icon: FolderKanbanIcon },
        { to: "/tasks", label: "Tasks", icon: ListTodoIcon },
        { to: "/calendar", label: "Agenda", icon: CalendarDaysIcon },
        { to: "/documents", label: "Documents", icon: FileTextIcon },
        { to: "/follow-ups", label: "Follow-ups", icon: MessageSquareIcon },
      ],
    },
    {
      id: "nav-ioc",
      label: "IOC",
      items: [{ to: "/ioc", label: "Consultants and budget", icon: UsersIcon }],
    },
    {
      id: "nav-intel",
      label: "Intelligence",
      items: [
        { to: "/ai", label: "AI tools", icon: SparklesIcon },
        { to: "/map", label: "System map", icon: WaypointsIcon },
      ],
    },
    {
      id: "nav-control",
      label: "Control",
      items: [
        { to: "/integrations", label: "Integrations", icon: PlugIcon },
        ...(user?.permissions.viewAudit ? [{ to: "/audit", label: "Audit trail", icon: ScrollTextIcon }] : []),
        { to: "/pilot", label: "Pilot notes", icon: NotebookPenIcon },
      ],
    },
  ];

  return (
    <SidebarProvider>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:shadow-md"
        href="#main"
      >
        Skip to content
      </a>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="group-data-[collapsible=icon]:items-center">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="Impact One"
                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
              >
                <NavLink to="/" end aria-label="Impact One, overview" className="text-sidebar-foreground">
                  <Logo className="h-7 group-data-[collapsible=icon]:hidden" />
                  <Logo variant="mark" className="hidden size-7 group-data-[collapsible=icon]:inline-block" />
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SideNav groups={groups} />
        </SidebarContent>
        {user ? (
          <SidebarFooter>
            <div className="grid gap-2 px-1 py-1">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Sign out" onClick={() => void signOut()}>
                    <LogOutIcon />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarFooter>
        ) : null}
        <SidebarRail />
      </Sidebar>
      <SidebarInset id="main">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-[var(--badge-shell-border)] bg-[var(--brand-soft)] px-2.5 text-xs font-medium text-foreground"
              >
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Pilot
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left">
              Google Calendar schedules meetings, invitations, availability, and sharing for executive and manager roles.
              Slack, ClickUp, Drive, Make, and Instagram are not changed from this desk.
            </TooltipContent>
          </Tooltip>
        </header>
        <div key={pathname} className="page-rise w-full flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
