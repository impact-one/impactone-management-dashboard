import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "../components/DataTable";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
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

  return (
    <>
      <PageHeader
        eyebrow="Control"
        title="Integrations"
        lede="Google Calendar schedules meetings, invitations, availability, and sharing. ClickUp and Drive stay read-only. Slack, Make, Instagram, and the budget sheet have no client."
      />
      {loading && !data ? <Loading label="Checking integrations" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
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
      {data ? (
        <>
          <p className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
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
        </>
      ) : null}
    </>
  );
}
