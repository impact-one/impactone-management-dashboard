import { FlagIcon, UsersIcon, WalletIcon, ListTodoIcon, CalendarRangeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "../app/AuthContext";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  countBy,
} from "../components/charts";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { IocSkeleton, SectionTableSkeleton } from "../components/PageSkeleton";
import { ReviewList, SourceBadge } from "../components/SourceBadge";
import { MetricStrip, Section } from "../components/Surface";
import { formatMoney, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Budget, Consultant, Envelope, Milestone } from "../types";

export function IocPage() {
  const { user } = useAuth();
  const consultants = useApi<Envelope<Consultant[]>>("/consultants");
  const milestones = useApi<Envelope<Milestone[]>>("/milestones");
  const budget = useApi<Envelope<Budget>>(user?.permissions.viewBudget ? "/budgets" : null);

  const loadingShell =
    consultants.loading || milestones.loading || (user?.permissions.viewBudget ? budget.loading : false);
  const anyError = consultants.error || milestones.error || budget.error;

  return (
    <>
      <PageHeader
        eyebrow="IOC"
        title="Consultants and budget"
        lede="IOC consultants, programme milestones, and budget lines for King Salman Park Hills."
      />
      <nav
        className="sticky top-14 z-10 -mx-3 mb-5 flex flex-wrap gap-2 border-b bg-background/95 px-3 py-2.5 backdrop-blur-md md:-mx-5 md:px-5"
        aria-label="IOC sections"
      >
        <Button variant="outline" size="sm" asChild>
          <a href="#consultants">Consultants</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="#budget">Budget</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="#milestones">Milestones</a>
        </Button>
      </nav>

      {loadingShell && !consultants.data && !milestones.data && !budget.data ? <IocSkeleton /> : null}
      {anyError && !consultants.data && !milestones.data && !budget.data ? (
        <RetryableError
          message={consultants.error || milestones.error || budget.error || "Request failed."}
          onRetry={() => {
            consultants.reload();
            milestones.reload();
            budget.reload();
          }}
        />
      ) : null}

      {consultants.data || milestones.data || budget.data || !loadingShell ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              {
                label: "Consultants",
                value: consultants.data?.data.length ?? 0,
                icon: <UsersIcon />,
              },
              {
                label: "Milestones",
                value: milestones.data?.data.length ?? 0,
                icon: <CalendarRangeIcon />,
              },
              {
                label: "Budget lines",
                value: budget.data?.data.lines.length ?? 0,
                icon: <WalletIcon />,
              },
              {
                label: "Open consult.",
                value: (consultants.data?.data ?? []).filter((row) => row.status !== "done").length,
                icon: <ListTodoIcon />,
              },
              {
                label: "Flagged",
                value: (consultants.data?.data ?? []).filter((row) => row.reviewFlags.length > 0).length,
                icon: <FlagIcon />,
              },
            ]}
          />
          {(consultants.data || milestones.data) && (
            <ChartRow>
              <ChartPanel title="Consultant status" className="lg:col-span-5">
                <SoftBarChart
                  data={countBy(consultants.data?.data ?? [], (row) => plainStatus(row.status))}
                  layout="horizontal"
                  compact
                />
              </ChartPanel>
              <ChartPanel title="Milestone status" className="lg:col-span-3">
                <SoftDonutChart
                  data={countBy(milestones.data?.data ?? [], (row) => plainStatus(row.status))}
                  centerLabel="Marks"
                  compact
                />
              </ChartPanel>
              <ChartPanel title="Consultant tracks" className="lg:col-span-4">
                <SoftProgressTracks data={countBy(consultants.data?.data ?? [], (row) => plainStatus(row.status))} />
              </ChartPanel>
            </ChartRow>
          )}
      <Section id="consultants" title="Consultants">
        {consultants.error ? <RetryableError message={consultants.error} onRetry={consultants.reload} /> : null}
        {consultants.data?.meta.note ? <Note>{consultants.data.meta.note}</Note> : null}
        {consultants.loading && !consultants.data ? <SectionTableSkeleton label="Loading consultants" /> : null}
        {consultants.data ? (
          <DataTable
            caption="Consultant directory"
            rows={consultants.data?.data ?? []}
            columns={[
              { key: "role", header: "Role", render: (row) => row.role },
              { key: "project", header: "Project", render: (row) => row.projectName },
              { key: "scope", header: "Scope", render: (row) => row.scope },
              {
                key: "status",
                header: "Status",
                render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
              },
              {
                key: "fee",
                header: "Fee",
                render: (row) => {
                  if (!user?.permissions.viewConsultantFees) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help text-muted-foreground underline decoration-dotted">Hidden</span>
                        </TooltipTrigger>
                        <TooltipContent>Consultant fees are limited to executive and manager roles.</TooltipContent>
                      </Tooltip>
                    );
                  }
                  if (row.feeAmount === null) return "Not set";
                  return formatMoney(row.feeAmount, row.currency);
                },
              },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              { key: "review", header: "Review", render: (row) => <ReviewList flags={row.reviewFlags} /> },
            ]}
          />
        ) : null}
      </Section>

      <Section id="budget" title="Budget">
        {!user?.permissions.viewBudget ? (
          <Note>Budget figures are restricted to executive and manager roles.</Note>
        ) : null}
        {budget.error ? <RetryableError message={budget.error} onRetry={budget.reload} /> : null}
        {user?.permissions.viewBudget && budget.loading && !budget.data ? (
          <SectionTableSkeleton label="Loading budget" />
        ) : null}
        {budget.data ? (
          <>
            <Note>{budget.data.data.source.detail}</Note>
            <ul className="mb-3 grid list-none gap-1 p-0 text-sm text-muted-foreground">
              {budget.data.data.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <DataTable
              caption="Budget lines"
              rows={budget.data.data.lines}
              columns={[
                { key: "category", header: "Category", render: (row) => row.category },
                {
                  key: "amount",
                  header: "Amount",
                  render: (row) => formatMoney(row.amount, budget.data?.data.currency ?? "SAR"),
                },
                { key: "note", header: "Note", render: (row) => row.note },
              ]}
            />
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Total:</span>{" "}
              {formatMoney(budget.data.data.total, budget.data.data.currency)}{" "}
              <SourceBadge origin={budget.data.data.source.origin} />
            </p>
          </>
        ) : null}
      </Section>

      <Section id="milestones" title="Milestones">
        {milestones.error ? <RetryableError message={milestones.error} onRetry={milestones.reload} /> : null}
        {milestones.loading && !milestones.data ? <SectionTableSkeleton label="Loading milestones" /> : null}
        {milestones.data ? (
          <DataTable
            caption="Milestones"
            rows={milestones.data.data.filter((item) => item.projectId === "ksp-hills" || item.projectId === "io-ops")}
            columns={[
              { key: "title", header: "Milestone", render: (row) => row.title },
              { key: "project", header: "Project", render: (row) => row.projectName },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              {
                key: "status",
                header: "Status",
                render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
              },
              { key: "date", header: "Target", render: (row) => <Due value={row.targetDate} /> },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              { key: "review", header: "Review", render: (row) => <ReviewList flags={row.reviewFlags} /> },
            ]}
          />
        ) : null}
      </Section>
        </div>
      ) : null}
    </>
  );
}
