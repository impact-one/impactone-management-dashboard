import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityIcon, ScrollTextIcon, ShieldIcon, UsersIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { MetricStrip } from "../components/Surface";
import { formatWhen } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { AuditEvent, Envelope } from "../types";

export function AuditPage() {
  const { user } = useAuth();
  const allowed = Boolean(user?.permissions.viewAudit);
  const { data, error, loading, reload } = useApi<Envelope<AuditEvent[]>>(allowed ? "/audit" : null);
  const rows = data?.data ?? [];
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const roles = useMemo(() => Array.from(new Set(rows.map((item) => item.role))), [rows]);

  const visible = rows.filter((item) => {
    const haystack = `${item.actorEmail} ${item.action} ${item.path}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (role !== "all" && item.role !== role) return false;
    return true;
  });

  const roleMix = useMemo(() => countBy(rows, (item) => item.role), [rows]);
  const statusMix = useMemo(() => countBy(rows, (item) => String(item.status)), [rows]);
  const okCount = rows.filter((item) => item.status >= 200 && item.status < 300).length;

  if (!allowed) {
    return (
      <>
        <PageHeader
          eyebrow="Control"
          title="Audit trail"
          lede="Signed-in activity across dashboard routes. Credentials and payloads are never stored."
        />
        <EmptyState
          title="Not available for this account"
          description="Audit access is limited to executive and manager roles."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Control"
        title="Audit trail"
        lede="Signed-in activity across dashboard routes. Credentials and payloads are never stored."
      />
      {loading && !data ? <TablePageSkeleton label="Loading audit trail" columns={5} filters={2} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? (
        <div className="mb-6">
          <Note>{data.meta.note}</Note>
        </div>
      ) : null}
      {data ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Events", value: rows.length, icon: <ScrollTextIcon /> },
              { label: "Roles", value: roles.length, icon: <UsersIcon /> },
              { label: "OK responses", value: okCount, icon: <CheckCircle2Icon /> },
              { label: "Actors", value: new Set(rows.map((item) => item.actorEmail)).size, icon: <ShieldIcon /> },
              { label: "Visible", value: visible.length, icon: <ActivityIcon /> },
            ]}
          />
          <ChartRow>
            <ChartPanel title="Events by role" className="lg:col-span-5">
              <SoftBarChart data={roleMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="HTTP status" className="lg:col-span-3">
              <SoftDonutChart data={statusMix} centerLabel="Status" compact />
            </ChartPanel>
            <ChartPanel title="Role tracks" className="lg:col-span-4">
              <SoftProgressTracks data={roleMix} />
            </ChartPanel>
          </ChartRow>
          <FilterBar>
            <FilterSearch id="audit-search" label="Search audit" value={query} onChange={setQuery} placeholder="Email or action…" />
            <FilterSelect
              id="audit-role"
              label="Role"
              value={role}
              onChange={setRole}
              options={[
                { value: "all", label: "All roles" },
                ...roles.map((item) => ({ value: item, label: item })),
              ]}
            />
          </FilterBar>
          <ResultCount shown={visible.length} total={rows.length} label="events" />
          <DataTable
            caption="Recent reads"
            rows={visible}
            empty="No events yet. Move around the dashboard and come back."
            columns={[
              { key: "when", header: "When", render: (row) => formatWhen(row.at) },
              { key: "who", header: "Who", render: (row) => row.actorEmail },
              { key: "role", header: "Role", render: (row) => <span className="capitalize">{row.role}</span> },
              { key: "action", header: "Action", render: (row) => row.action },
              { key: "status", header: "Status", render: (row) => String(row.status) },
            ]}
          />
        </div>
      ) : null}
    </>
  );
}
