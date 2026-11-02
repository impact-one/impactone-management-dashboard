import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "../components/DataTable";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
import { useApi } from "../lib/useApi";
import type { DocumentItem, Envelope, Origin } from "../types";

export function DocumentsPage() {
  const { data, error, loading, reload } = useApi<Envelope<DocumentItem[]>>("/documents");
  const documents = data?.data ?? [];
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [project, setProject] = useState("all");
  const [needsReview, setNeedsReview] = useState(false);
  const projects = useMemo(() => Array.from(new Set(documents.map((item) => item.projectName))), [documents]);

  const visible = documents.filter((item) => {
    const haystack = `${item.title} ${item.owner} ${item.source.detail}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (project !== "all" && item.projectName !== project) return false;
    if (origin !== "all" && item.source.origin !== origin) return false;
    if (needsReview && item.reviewFlags.length === 0) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Documents"
        lede="Known files from the brief, with a slot for Drive metadata once read-only access exists. File contents are not downloaded."
      />
      {loading && !data ? <Loading label="Loading documents" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      <FilterBar>
        <FilterSearch id="doc-search" label="Search documents" value={query} onChange={setQuery} />
        <FilterSelect
          id="doc-project"
          label="Project"
          value={project}
          onChange={setProject}
          options={[{ value: "all", label: "All projects" }, ...projects.map((name) => ({ value: name, label: name }))]}
        />
        <FilterOrigin value={origin} onChange={setOrigin} />
        <label className="flex h-9 items-end gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={needsReview}
            onChange={(event) => setNeedsReview(event.target.checked)}
          />
          Needs review only
        </label>
      </FilterBar>
      {data ? (
        <>
          <ResultCount shown={visible.length} total={documents.length} label="documents" />
          <DataTable
            caption="Documents and links"
            rows={visible}
            empty="No document matches this filter."
            columns={[
              {
                key: "title",
                header: "Document",
                render: (row) =>
                  row.href ? (
                    <a
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.title}
                    </a>
                  ) : (
                    row.title
                  ),
              },
              {
                key: "project",
                header: "Project",
                render: (row) =>
                  row.projectId ? (
                    <Link to={`/projects/${row.projectId}`} className="underline-offset-4 hover:underline">
                      {row.projectName}
                    </Link>
                  ) : (
                    row.projectName
                  ),
              },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              {
                key: "detail",
                header: "Detail",
                render: (row) => <span className="text-muted-foreground">{row.source.detail}</span>,
              },
              {
                key: "review",
                header: "Review",
                render: (row) =>
                  row.reviewFlags.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-[var(--badge-shell-border)] bg-[var(--badge-shell-bg)] text-[var(--origin-review-fg)]"
                      title={row.reviewFlags.join(" · ")}
                    >
                      {row.reviewFlags.length} flag{row.reviewFlags.length === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
            ]}
          />
        </>
      ) : null}
    </>
  );
}
