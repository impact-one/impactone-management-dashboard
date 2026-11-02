import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { PageHeader, RetryableError } from "../components/PageHeader";
import { MapSkeleton } from "../components/PageSkeleton";
import { ReviewList, SourceBadge, StepStateBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
import { useApi } from "../lib/useApi";
import type { Envelope, SystemMap } from "../types";

export function SystemMapPage() {
  const { data, error, loading, reload } = useApi<Envelope<SystemMap>>("/system-map");
  const map = data?.data;
  const [openFlows, setOpenFlows] = useState<Record<string, boolean>>({});

  return (
    <>
      <PageHeader
        eyebrow="Day 1"
        title="System map"
        lede="Tools, automations, and data sources the dashboard can reuse. A step is Documented only when the brief says so. Everything else is Needs review."
      />
      {loading && !map ? <MapSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {map ? (
        <>
          <nav
            className="sticky top-14 z-10 -mx-4 mb-4 flex flex-wrap gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6"
            aria-label="System map sections"
          >
            <Button variant="outline" size="sm" asChild>
              <a href="#flows">Flows</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#tools">Tools</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#sources">Data sources</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#agents">Agents</a>
            </Button>
          </nav>

          <section className="grid gap-3" id="flows" aria-labelledby="flows-heading">
            <div className="mb-1 flex items-center gap-3">
              <h2 id="flows-heading" className="text-sm font-semibold tracking-tight">
                Flows
              </h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            {map.flows.length === 0 ? (
              <EmptyState title="No flows documented" description="Known automation flows will appear here." />
            ) : (
              map.flows.map((flow) => {
                const open = openFlows[flow.id] ?? true;
                return (
                  <Card key={flow.id} className="gap-0 py-0 shadow-sm">
                    <CardHeader className="gap-1 border-b px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                            {flow.owner}
                          </p>
                          <h3 className="text-base font-semibold tracking-tight">{flow.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{flow.summary}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenFlows((current) => ({ ...current, [flow.id]: !open }))}
                        >
                          {open ? "Collapse" : "Expand"}
                        </Button>
                      </div>
                    </CardHeader>
                    {open ? (
                      <CardContent className="px-4 py-4">
                        <ol
                          className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4"
                          aria-label={`${flow.title} steps`}
                        >
                          {flow.steps.map((step, index) => (
                            <li key={step.name} className="rounded-lg border bg-background p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="grid size-6 place-items-center rounded-md bg-accent text-xs font-semibold text-primary">
                                  {index + 1}
                                </span>
                                <StepStateBadge state={step.state} />
                              </div>
                              <p className="mt-2 text-sm font-medium">{step.name}</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.note}</p>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-3">
                          <ReviewList flags={flow.reviewFlags} />
                        </div>
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })
            )}
          </section>

          <Section id="tools" title="Tools and licences">
            <DataTable
              caption="Existing tools"
              rows={map.tools}
              columns={[
                { key: "name", header: "Tool", render: (row) => row.name },
                { key: "area", header: "Area", render: (row) => row.area },
                { key: "owner", header: "Owner", render: (row) => row.owner },
                { key: "purpose", header: "Purpose", render: (row) => row.purpose },
                { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
                { key: "review", header: "Review", render: (row) => <ReviewList flags={row.reviewFlags} /> },
              ]}
            />
          </Section>
          <Section id="sources" title="Data sources">
            <DataTable
              caption="Where dashboard data comes from"
              rows={map.dataSources}
              columns={[
                { key: "name", header: "Source", render: (row) => row.name },
                { key: "holds", header: "Holds", render: (row) => row.holds },
                { key: "owner", header: "Owner", render: (row) => row.owner },
                { key: "used", header: "Used for", render: (row) => row.usedFor },
                { key: "state", header: "State", render: (row) => <SourceBadge origin={row.source.origin} /> },
                { key: "detail", header: "Detail", render: (row) => row.source.detail },
              ]}
            />
          </Section>
          <Section id="agents" title="Agents">
            <EmptyState title="No agents named" description={map.agentNote} />
          </Section>
        </>
      ) : null}
    </>
  );
}
