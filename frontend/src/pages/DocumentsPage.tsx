import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../app/AuthContext";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { ErrorNote, Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import type { DriveDesk, DriveFile, DriveKind, DriveRole, Envelope, Origin } from "../types";

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Envelope<DriveDesk>>("/documents/desk");
  const desk = data?.data;
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [project, setProject] = useState("all");
  const [needsReview, setNeedsReview] = useState(false);

  const known = desk?.known ?? [];
  const files = desk?.files ?? [];
  const projects = useMemo(() => {
    const names = new Set<string>();
    for (const item of known) names.add(item.projectName);
    for (const item of files) names.add(item.projectName);
    return Array.from(names);
  }, [known, files]);

  const visibleKnown = known.filter((item) => matches(item, query, project, origin, needsReview));
  const visibleFiles = files.filter((item) => matches(item, query, project, origin, needsReview));

  async function run(action: () => Promise<string>) {
    setFormError(undefined);
    setSaved(undefined);
    try {
      const message = await action();
      setSaved(message);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Request failed.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Documents"
        lede={desk?.operatingModel ?? "Google Drive holds the file. This desk keeps the name, the link, and who can open it."}
      >
        {desk ? (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Badge>{desk.bestFit}</Badge>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground sm:text-right">{desk.implementationNote}</p>
          </div>
        ) : null}
      </PageHeader>
      {loading && !data ? <Loading label="Loading documents" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}
      {desk ? (
        <>
          <Section title="How the tools work together">
            <ol className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {desk.steps.map((step, index) => (
                <li key={step.name} className="rounded-xl border bg-card p-3 shadow-sm">
                  <span className="grid size-6 place-items-center rounded-md bg-accent text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-2 text-sm font-medium">{step.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </Section>

          {desk.canManage ? (
            <CreateForm
              files={desk.files}
              projects={desk.projects}
              connected={desk.connected}
              onSubmit={(body) =>
                run(async () => {
                  await api("/documents/files", { method: "POST", body: JSON.stringify(body) });
                  return `Added “${body.title}”.`;
                })
              }
            />
          ) : (
            <Section title="Library">
              <EmptyState
                title="Creating files is limited to executive and manager roles"
                description={
                  user
                    ? `${user.name} can read the documents in view. Sharing stays with the people who run the library.`
                    : "Sign in as an executive or manager to add a file."
                }
              />
            </Section>
          )}

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

          <Section title="Drive">
            {visibleFiles.length === 0 ? (
              <EmptyState title="No Drive file matches this filter" description="Folders, Docs, and Sheets from the library show here." />
            ) : (
              <div className="grid gap-3">
                {visibleFiles.map((file) => (
                  <article key={file.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {file.href ? (
                            <a className="text-primary underline-offset-4 hover:underline" href={file.href} target="_blank" rel="noreferrer">
                              {file.title}
                            </a>
                          ) : (
                            file.title
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {kindLabel(file.kind)} · {file.folderName} · {roleLabel(file.accessRole)}
                          {file.projectId ? ` · ${file.projectName}` : file.projectName ? ` · ${file.projectName}` : ""}
                        </p>
                      </div>
                      <SourceBadge origin={file.source.origin} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{file.source.detail}</p>
                    {file.shares.length > 0 ? (
                      <ul className="mt-3 grid list-none gap-1 p-0 text-sm">
                        {file.shares.map((share) => (
                          <li key={share.email} className="flex flex-wrap items-center justify-between gap-2">
                            <span>{share.email}</span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              {roleLabel(share.role)}
                              {desk.canManage && share.role !== "owner" && (file.accessRole === "owner" || file.accessRole === "writer") ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() =>
                                    run(async () => {
                                      await api(`/documents/files/${encodeURIComponent(file.id)}/unshare`, {
                                        method: "POST",
                                        body: JSON.stringify({ email: share.email }),
                                      });
                                      return `Removed ${share.email}.`;
                                    })
                                  }
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {desk.canManage ? "People with access are listed for owners." : "Sharing list is hidden for this role."}
                      </p>
                    )}
                    {desk.canManage && (file.accessRole === "owner" || file.accessRole === "writer") ? (
                      <ShareForm
                        onSubmit={(email, role) =>
                          run(async () => {
                            await api(`/documents/files/${encodeURIComponent(file.id)}/sharing`, {
                              method: "POST",
                              body: JSON.stringify({ email, role }),
                            });
                            return `Sharing for ${email} is now ${roleLabel(role).toLowerCase()}.`;
                          })
                        }
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Section>

          <Section title="Known from the brief">
            <ResultCount shown={visibleKnown.length} total={known.length} label="documents" />
            <DataTable
              caption="Documents and links"
              rows={visibleKnown}
              empty="No document matches this filter."
              columns={[
                {
                  key: "title",
                  header: "Document",
                  render: (row) =>
                    row.href ? (
                      <a className="font-medium text-primary underline-offset-4 hover:underline" href={row.href} target="_blank" rel="noreferrer">
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
          </Section>
        </>
      ) : null}
    </>
  );
}

function matches(
  item: { title: string; owner: string; projectName: string; source: { origin: Origin; detail: string }; reviewFlags: string[] },
  query: string,
  project: string,
  origin: Origin | "all",
  needsReview: boolean,
) {
  const haystack = `${item.title} ${item.owner} ${item.source.detail}`.toLowerCase();
  if (query && !haystack.includes(query.toLowerCase())) return false;
  if (project !== "all" && item.projectName !== project) return false;
  if (origin !== "all" && item.source.origin !== origin) return false;
  if (needsReview && item.reviewFlags.length === 0) return false;
  return true;
}

function CreateForm({
  files,
  projects,
  connected,
  onSubmit,
}: {
  files: DriveFile[];
  projects: { id: string; name: string }[];
  connected: boolean;
  onSubmit: (body: { title: string; kind: "folder" | "document" | "spreadsheet"; folderId: string; projectId: string }) => void;
}) {
  const folders = files.filter((file) => file.kind === "folder" && (file.accessRole === "owner" || file.accessRole === "writer"));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = String(form.get("kind") ?? "document");
    onSubmit({
      title: String(form.get("title") ?? ""),
      kind: kind === "folder" || kind === "spreadsheet" ? kind : "document",
      folderId: String(form.get("folderId") ?? ""),
      projectId: connected ? "" : String(form.get("projectId") ?? ""),
    });
    event.currentTarget.reset();
  }

  return (
    <Section title="Add to the library">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="grid gap-1 text-sm">
          Name
          <Input name="title" required maxLength={140} placeholder="Team access notes" />
        </label>
        <label className="grid gap-1 text-sm">
          Kind
          <select name="kind" className={fieldClass} defaultValue="document" aria-label="Kind of file">
            <option value="folder">Folder</option>
            <option value="document">Google Doc</option>
            <option value="spreadsheet">Google Sheet</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Folder
          <select name="folderId" className={fieldClass} defaultValue="" aria-label="Folder">
            <option value="">My Drive</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
          </select>
        </label>
        {connected ? (
          <p className="self-end text-xs leading-5 text-muted-foreground">
            This creates an empty file in the connected Drive. File contents stay in Drive.
          </p>
        ) : (
          <label className="grid gap-1 text-sm">
            Project
            <select name="projectId" className={fieldClass} defaultValue="" aria-label="Project">
              <option value="">No project</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="sm:col-span-2">
          <Button type="submit">Add to Drive</Button>
        </div>
      </form>
    </Section>
  );
}

function ShareForm({ onSubmit }: { onSubmit: (email: string, role: Exclude<DriveRole, "owner">) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") ?? "reader");
    const sharing = role === "writer" || role === "commenter" ? role : "reader";
    onSubmit(String(form.get("email") ?? ""), sharing);
    event.currentTarget.reset();
  }

  return (
    <form className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_10rem_auto]" onSubmit={submit}>
      <Input name="email" type="email" required placeholder="person@impactone.example" aria-label="Person to share with" />
      <select name="role" className={fieldClass} defaultValue="reader" aria-label="Sharing permission">
        <option value="writer">Can edit</option>
        <option value="commenter">Can comment</option>
        <option value="reader">Can view</option>
      </select>
      <Button type="submit" variant="outline">
        Update sharing
      </Button>
    </form>
  );
}

function kindLabel(kind: DriveKind) {
  if (kind === "folder") return "Folder";
  if (kind === "document") return "Google Doc";
  if (kind === "spreadsheet") return "Google Sheet";
  return "File";
}

function roleLabel(role: DriveRole) {
  if (role === "owner") return "Owner";
  if (role === "writer") return "Can edit";
  if (role === "commenter") return "Can comment";
  return "Can view";
}
