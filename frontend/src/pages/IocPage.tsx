import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "../app/AuthContext";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { IocSkeleton, SectionTableSkeleton } from "../components/PageSkeleton";
import { ReviewList, SourceBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
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
        title="Consultants, budget, milestones"
        lede="The IOC slice of the dashboard: King Salman Park Hills consultants, a budget layout, and milestones. Money on this screen is fictional until finance approves a read."
      />
      <nav
        className="sticky top-14 z-10 -mx-4 mb-2 flex flex-wrap gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6"
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
        <>
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
          <Note>
            Budget amounts are limited to executive and manager roles. Ask a manager if you need the sample layout. This
            account can still see milestones and consultant scopes.
          </Note>
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
              caption="Sample IOC budget lines"
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
              <span className="font-medium">Sample total:</span>{" "}
              {formatMoney(budget.data.data.total, budget.data.data.currency)}{" "}
              <SourceBadge origin={budget.data.data.source.origin} />
            </p>
          </>
        ) : null}
      </Section>

      <Section id="milestones" title="Milestones">
        <Note>IOC desk shows milestones for King Salman Park Hills and Impact One operations.</Note>
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
        </>
      ) : null}
    </>
  );
}
