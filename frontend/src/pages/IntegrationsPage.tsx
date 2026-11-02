import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CableIcon, CheckCircle2Icon, PlugIcon, RadioIcon, FileWarningIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  countBy,
} from "../components/charts";
import { DataTable } from "../components/DataTable";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MetricStrip, Section } from "../components/Surface";
import { formatWhen, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, IntegrationStatus, Origin } from "../types";

export function IntegrationsPage() {
  const { data, error, loading, reload } = useApi<Envelope<IntegrationStatus[]>>("/integrations");
  const rows = data?.data ?? [];
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [group, setGroup] = useState<"all" | "configured" | "documented">("all");

  const visible = useMemo(() => {
    return rows.filter((item) => {
      const haystack = `${item.name} ${item.detail} ${item.limitation ?? ""}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (origin !== "all" && item.origin !== origin) return false;
      if (group === "configured" && !item.configured) return false;
      if (group === "documented" && item.configured) return false;
      return true;
    });
  }, [rows, query, origin, group]);

  const configured = rows.filter((item) => item.configured);
  const documented = rows.filter((item) => !item.configured);
  const liveCount = rows.filter((item) => item.origin === "live").length;
  const reviewCount = rows.filter((item) => item.origin === "needs-review").length;
  const originMix = useMemo(
    () =>
      countBy(rows, (item) => {
        if (item.origin === "live") return "Live";
        if (item.origin === "sample") return "Sample";
        if (item.origin === "documented") return "Documented";
        return "Needs review";
      }),
    [rows],
  );
  const modeMix = useMemo(() => countBy(rows, (item) => plainStatus(item.mode)), [rows]);

  return (
    <>
      <PageHeader
        eyebrow="Control"
        title="Integrations"
        lede="Connection status for Calendar, Drive, Slack, ClickUp, and related systems."
      />
      {loading && !data ? <TablePageSkeleton label="Checking integrations" columns={7} filters={3} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <div className="mb-6"><Note>{data.meta.note}</Note></div> : null}
      {data ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Systems", value: rows.length, icon: <PlugIcon /> },
              { label: "Configured", value: configured.length, icon: <CableIcon /> },
              { label: "Live", value: liveCount, icon: <RadioIcon /> },
              { label: "Documented only", value: documented.length, icon: <CheckCircle2Icon /> },
              { label: "Needs review", value: reviewCount, icon: <FileWarningIcon /> },
            ]}
          />
          <ChartRow>
            <ChartPanel title="Mode mix" className="lg:col-span-5">
              <SoftBarChart data={modeMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="Connection state" className="lg:col-span-3">
              <SoftDonutChart data={originMix} centerLabel="State" compact />
            </ChartPanel>
            <ChartPanel title="Health tracks" className="lg:col-span-4">
              <SoftProgressTracks data={originMix} />
            </ChartPanel>
          </ChartRow>
          <FilterBar>
            <FilterSearch id="int-search" label="Search integrations" value={query} onChange={setQuery} />
            <FilterOrigin value={origin} onChange={setOrigin} />
            <FilterSelect
              id="int-group"
              label="Group"
              value={group}
              onChange={(value) => setGroup(value as typeof group)}
              options={[
                { value: "all", label: "All systems" },
                { value: "configured", label: "Token path configured" },
                { value: "documented", label: "Documented only" },
              ]}
            />
          </FilterBar>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{configured.length} with token path</Badge>
            <Badge variant="outline">{documented.length} documented only</Badge>
            <Button variant="link" className="h-auto px-0" asChild>
              <Link to="/map">Open system map</Link>
            </Button>
          </p>
          <ResultCount shown={visible.length} total={rows.length} label="integrations" />
          <Section title="Status">
            <DataTable
              caption="Integration status"
              rows={visible}
              empty="No integration matches this filter."
              columns={[
                { key: "name", header: "System", render: (row) => row.name },
                {
                  key: "mode",
                  header: "Mode",
                  render: (row) => <span className="capitalize">{plainStatus(row.mode)}</span>,
                },
                {
                  key: "configured",
                  header: "Token",
                  render: (row) => (row.configured ? "Configured" : "Not set"),
                },
                { key: "state", header: "Data", render: (row) => <SourceBadge origin={row.origin} /> },
                { key: "detail", header: "Detail", render: (row) => row.detail },
                {
                  key: "limit",
                  header: "Limitation",
                  render: (row) => row.limitation ?? <span className="text-muted-foreground">—</span>,
                },
                {
                  key: "checked",
                  header: "Last check",
                  render: (row) => (row.lastCheckedAt ? formatWhen(row.lastCheckedAt) : "Not called"),
                },
              ]}
            />
          </Section>
        </div>
      ) : null}
    </>
  );
}
