import { ChevronRightIcon, CircleAlertIcon, DatabaseIcon, BoxesIcon, WaypointsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EmptyState } from "../components/EmptyState";
import { PageHeader, RetryableError } from "../components/PageHeader";
import { MapSkeleton } from "../components/PageSkeleton";
import { ReviewList, SourceBadge } from "../components/SourceBadge";
import { CardGrid, MetricStrip, RecordCard } from "../components/Surface";
import { useApi } from "../lib/useApi";
import type { AutomationFlow, Envelope, FlowStep, SystemMap } from "../types";

export function SystemMapPage() {
  const { data, error, loading, reload } = useApi<Envelope<SystemMap>>("/system-map");
  const map = data?.data;
  const gaps = map?.flows.reduce((count, flow) => count + flow.steps.filter((step) => step.state === "needs-review").length, 0) ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="System map"
        lede="The paths between tools, and where this desk reads from. A step marked Needs review is not a live connection."
      />
      {loading && !map ? <MapSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {map ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Flows", value: map.flows.length, hint: "Paths named in the brief.", icon: <WaypointsIcon /> },
              {
                label: "Open gaps",
                value: gaps,
                hint: "Steps that are not confirmed.",
                icon: <CircleAlertIcon />,
                tone: gaps > 0 ? "warn" : "good",
              },
              { label: "Tools", value: map.tools.length, hint: "Licences and systems listed.", icon: <BoxesIcon /> },
              { label: "Sources", value: map.dataSources.length, hint: "Where this desk reads from.", icon: <DatabaseIcon /> },
            ]}
          />

          <Tabs defaultValue="flows">
            <TabsList>
              <TabsTrigger value="flows">Flows</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="sources">Data sources</TabsTrigger>
            </TabsList>

            <TabsContent value="flows" className="mt-4 space-y-4">
              {map.flows.length === 0 ? (
                <EmptyState title="No flows documented" description="Known automation paths will appear here." />
              ) : (
                map.flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)
              )}
            </TabsContent>

            <TabsContent value="tools" className="mt-4">
              {map.tools.length === 0 ? (
                <EmptyState title="No tools listed" description="Named tools and licences will appear here." />
              ) : (
                <CardGrid>
                  {map.tools.map((tool) => (
                    <li key={tool.id}>
                      <RecordCard
                        kicker={tool.area}
                        title={tool.name}
                        origin={tool.source.origin}
                        summary={tool.purpose}
                        fields={[
                          { label: "Owner", value: tool.owner },
                          { label: "Noted from", value: tool.source.detail, wide: true },
                        ]}
                        flags={tool.reviewFlags}
                      />
                    </li>
                  ))}
                </CardGrid>
              )}
            </TabsContent>

            <TabsContent value="sources" className="mt-4">
              {map.dataSources.length === 0 ? (
                <EmptyState title="No data sources" description="Systems this desk reads from will appear here." />
              ) : (
                <CardGrid columns="2">
                  {map.dataSources.map((source) => (
                    <li key={source.id}>
                      <RecordCard
                        kicker={source.owner}
                        title={source.name}
                        origin={source.source.origin}
                        summary={source.usedFor}
                        fields={[
                          { label: "Holds", value: source.holds },
                          { label: "Detail", value: source.source.detail, wide: true },
                        ]}
                      />
                    </li>
                  ))}
                </CardGrid>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </>
  );
}

function FlowCard({ flow }: { flow: AutomationFlow }) {
  return (
    <article className="surface rounded-2xl bg-card p-4 ring-0 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-medium text-muted-foreground">{flow.owner}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">{flow.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{flow.summary}</p>
        </div>
        <SourceBadge origin={flow.source.origin} />
      </div>
      <ol className="mt-4 flex list-none flex-col gap-2 p-0 lg:flex-row lg:items-stretch" aria-label={`${flow.title} steps`}>
        {flow.steps.map((step, index) => (
          <li key={step.name} className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-stretch">
            <StepCard step={step} index={index} />
            {index < flow.steps.length - 1 ? (
              <span className="grid place-items-center text-muted-foreground lg:px-1" aria-hidden="true">
                <ChevronRightIcon className="size-4 rotate-90 lg:rotate-0" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {flow.reviewFlags.length > 0 ? (
        <div className="mt-4">
          <ReviewList flags={flow.reviewFlags} />
        </div>
      ) : null}
    </article>
  );
}

function StepCard({ step, index }: { step: FlowStep; index: number }) {
  const gap = step.state === "needs-review";
  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-xl border bg-background p-3",
        gap ? "border-[color-mix(in_oklch,var(--origin-review-dot)_45%,var(--border))]" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-6 place-items-center rounded-md bg-accent text-xs font-semibold text-primary">{index + 1}</span>
        <SourceBadge origin={step.state} />
      </div>
      <p className="mt-2 text-sm font-medium">{step.name}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.note}</p>
    </div>
  );
}
