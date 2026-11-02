import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../app/AuthContext";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
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

  if (!allowed) {
    return (
      <>
        <PageHeader
          eyebrow="Control"
          title="Audit trail"
          lede="Authenticated reads during this API process. Passwords, tokens, and response bodies are not stored."
        />
        <EmptyState
          title="Not available for this account"
          description="Audit events are limited to executive and manager roles."
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
        lede="Who opened which route during this API process. Passwords, tokens, and response bodies are not stored."
      />
      {loading && !data ? <Loading label="Loading audit trail" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
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
      {data ? (
        <>
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
        </>
      ) : null}
    </>
  );
}
