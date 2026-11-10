import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRightIcon,
  HardDriveIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { DeskSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { api } from "../lib/api";
import { downloadApiFile } from "../lib/download";
import { useApi } from "../lib/useApi";
import type { DriveDesk, DriveFile, DriveKind, DriveRole, Envelope, Origin } from "../types";

const fieldClass =
  "h-8 w-full min-w-0 max-w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const chipClass =
  "h-8 w-full min-w-0 max-w-full rounded-full border border-border bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-auto";

function useNarrowScreen(maxWidth = 1023) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return narrow;
}

type Place = "drive" | "shared";
type ViewMode = "grid" | "list";
type CreateKind = "folder" | "document" | "spreadsheet";

export function DocumentsPage() {
  const { data, error, loading, reload } = useApi<Envelope<DriveDesk>>("/documents/desk");
  const desk = data?.data;
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [project, setProject] = useState("all");
  const [needsReview, setNeedsReview] = useState(false);
  const [place, setPlace] = useState<Place>("drive");
  const [view, setView] = useState<ViewMode>("grid");
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind>("document");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [created, setCreated] = useState<DriveFile[]>([]);
  const narrow = useNarrowScreen();

  const serverFiles = desk?.files ?? [];
  const files = useMemo(() => {
    const ids = new Set(serverFiles.map((file) => file.id));
    return [...created.filter((file) => !ids.has(file.id)), ...serverFiles];
  }, [created, serverFiles]);
  const projects = useMemo(() => {
    const names = new Set<string>();
    for (const item of files) names.add(item.projectName);
    return Array.from(names).filter(Boolean);
  }, [files]);

  const folderById = useMemo(() => {
    const map = new Map<string, DriveFile>();
    for (const file of files) {
      if (file.kind === "folder") map.set(file.id, file);
    }
    return map;
  }, [files]);

  const currentFolderId = folderStack.at(-1) ?? null;
  const searching = query.trim().length > 0;

  const visibleFiles = useMemo(() => {
    const ownedIds = new Set(files.filter((file) => file.accessRole === "owner").map((file) => file.id));
    const sharedIds = new Set(files.filter((file) => file.accessRole !== "owner").map((file) => file.id));
    return files.filter((file) => {
      if (!matches(file, query, project, origin, needsReview)) return false;
      const mine = file.accessRole === "owner";
      if (place === "drive" && !mine) return false;
      if (place === "shared" && mine) return false;
      if (searching) return true;
      if (currentFolderId) return file.folderId === currentFolderId;
      const parents = mine ? ownedIds : sharedIds;
      return !file.folderId || !parents.has(file.folderId);
    });
  }, [files, query, project, origin, needsReview, place, searching, currentFolderId]);

  const folders = visibleFiles.filter((file) => file.kind === "folder");
  const documents = visibleFiles.filter((file) => file.kind !== "folder");
  const selectedFile = files.find((file) => file.id === selectedId) ?? null;
  const crumbs = folderStack.map((id) => folderById.get(id)).filter((folder): folder is DriveFile => Boolean(folder));

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

  function goPlace(next: Place) {
    setPlace(next);
    setFolderStack([]);
    setSelectedId(null);
  }

  function openFolder(id: string) {
    setFolderStack((stack) => [...stack, id]);
    setSelectedId(null);
    setQuery("");
  }

  function openCreate(kind: CreateKind) {
    setCreateKind(kind);
    setCreateOpen(true);
  }

  async function downloadItem(id: string) {
    setFormError(undefined);
    setDownloadingId(id);
    try {
      await downloadApiFile(`/documents/files/${encodeURIComponent(id)}/download`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Could not download that file.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-6rem)] flex-col sm:min-h-[calc(100svh-6.5rem)]">
      <PageHeader
        eyebrow="Work"
        title="Documents"
        lede="Open a folder, then click a file to download it and open it on this computer."
      />
      {loading && !data ? <DeskSkeleton label="Loading documents" rows={4} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}
      {desk ? (
        <>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid min-w-0 flex-1 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)]">
            <aside className="border-b border-border bg-muted/30 p-3 lg:border-r lg:border-b-0">
              {desk.canManage ? (
                <Button type="button" className="mb-4 h-11 w-full justify-start rounded-2xl px-3 shadow-sm" onClick={() => openCreate("document")}>
                  <PlusIcon data-icon="inline-start" />
                  New
                </Button>
              ) : (
                <p className="mb-4 rounded-xl bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                  You can browse. Creating and sharing need manager access.
                </p>
              )}
              <nav aria-label="Drive places" className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                <PlaceButton active={place === "drive"} icon={<HardDriveIcon />} label="My Drive" onClick={() => goPlace("drive")} />
                <PlaceButton active={place === "shared"} icon={<UsersIcon />} label="Shared with me" onClick={() => goPlace("shared")} />
              </nav>
            </aside>

            <div className="min-w-0">
              <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:px-4">
                <div className="relative min-w-0 flex-1">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search in Drive"
                    aria-label="Search documents"
                    className="h-10 rounded-full bg-muted/50 pl-9"
                  />
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <ViewButton active={view === "grid"} label="Grid view" onClick={() => setView("grid")}>
                    <LayoutGridIcon />
                  </ViewButton>
                  <ViewButton active={view === "list"} label="List view" onClick={() => setView("list")}>
                    <ListIcon />
                  </ViewButton>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-b border-border px-3 py-2 min-[520px]:grid-cols-[repeat(2,minmax(0,1fr))] sm:px-4 lg:flex lg:flex-wrap lg:items-center">
                <select className={chipClass} aria-label="Project" value={project} onChange={(event) => setProject(event.target.value)}>
                  <option value="all">All projects</option>
                  {projects.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={chipClass}
                  aria-label="Origin"
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value as Origin | "all")}
                >
                  <option value="all">All origins</option>
                  <option value="live">Live</option>
                  <option value="sample">Sample</option>
                  <option value="documented">Documented</option>
                  <option value="needs-review">Needs review</option>
                </select>
                <label className="flex h-8 w-full min-w-0 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs lg:w-auto">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={needsReview}
                    onChange={(event) => setNeedsReview(event.target.checked)}
                  />
                  Needs review
                </label>
              </div>

              <div className={cn("grid min-w-0", !narrow && selectedFile && "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]")}>
                <div className="min-w-0 px-3 py-4 sm:px-4">
                  <nav aria-label="Folder path" className="mb-4 flex min-w-0 flex-wrap items-center gap-1 text-sm">
                    <button type="button" className="max-w-full truncate text-left font-medium hover:underline" onClick={() => setFolderStack([])}>
                      {place === "shared" ? "Shared with me" : "My Drive"}
                    </button>
                    {!searching
                      ? crumbs.map((folder, index) => (
                          <span key={folder.id} className="flex min-w-0 max-w-full items-center gap-1">
                            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <button
                              type="button"
                              className={cn("max-w-[12rem] truncate text-left hover:underline", index === crumbs.length - 1 && "font-medium")}
                              onClick={() => setFolderStack(folderStack.slice(0, index + 1))}
                            >
                              {folder.title}
                            </button>
                          </span>
                        ))
                      : null}
                    {searching ? (
                      <span className="text-muted-foreground">
                        <ChevronRightIcon className="mr-1 inline size-3.5" />
                        Search results
                      </span>
                    ) : null}
                  </nav>

                  <DriveView
                    folders={folders}
                    documents={documents}
                    view={view}
                    selectedId={selectedId}
                    downloadingId={downloadingId}
                    emptyTitle={searching ? "No files match that search" : currentFolderId ? "This folder is empty" : "Nothing here yet"}
                    emptyDescription={
                      desk.canManage && place === "drive"
                        ? "Use New to add a folder, Doc, or Sheet. Files you create stay in My Drive."
                        : place === "shared"
                          ? "Files other people share with you appear here."
                          : "Files appear here when they are on a Drive you can open."
                    }
                    onSelect={setSelectedId}
                    onOpenFolder={openFolder}
                    onDownload={downloadItem}
                  />
                </div>

                {!narrow && selectedFile ? (
                  <FileDetails
                    file={selectedFile}
                    canManage={desk.canManage}
                    onClose={() => setSelectedId(null)}
                    onOpenFolder={() => openFolder(selectedFile.id)}
                    onDownload={() => downloadItem(selectedFile.id)}
                    downloading={downloadingId === selectedFile.id}
                    onShare={(email, role) =>
                      run(async () => {
                        await api(`/documents/files/${encodeURIComponent(selectedFile.id)}/sharing`, {
                          method: "POST",
                          body: JSON.stringify({ email, role }),
                        });
                        return `Sharing for ${email} is now ${roleLabel(role).toLowerCase()}.`;
                      })
                    }
                    onUnshare={(email) =>
                      run(async () => {
                        await api(`/documents/files/${encodeURIComponent(selectedFile.id)}/unshare`, {
                          method: "POST",
                          body: JSON.stringify({ email }),
                        });
                        return `Removed ${email}.`;
                      })
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {narrow ? (
          <Sheet open={Boolean(selectedFile)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="max-h-[min(85dvh,40rem)] w-full gap-0 overflow-y-auto overscroll-contain rounded-t-2xl p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{selectedFile?.title ?? "Details"}</SheetTitle>
                <SheetDescription>Details for the selected item.</SheetDescription>
              </SheetHeader>
              {selectedFile ? (
                <FileDetails
                  framed={false}
                  file={selectedFile}
                  canManage={desk.canManage}
                  onClose={() => setSelectedId(null)}
                  onOpenFolder={() => openFolder(selectedFile.id)}
                  onDownload={() => downloadItem(selectedFile.id)}
                  downloading={downloadingId === selectedFile.id}
                  onShare={(email, role) =>
                    run(async () => {
                      await api(`/documents/files/${encodeURIComponent(selectedFile.id)}/sharing`, {
                        method: "POST",
                        body: JSON.stringify({ email, role }),
                      });
                      return `Sharing for ${email} is now ${roleLabel(role).toLowerCase()}.`;
                    })
                  }
                  onUnshare={(email) =>
                    run(async () => {
                      await api(`/documents/files/${encodeURIComponent(selectedFile.id)}/unshare`, {
                        method: "POST",
                        body: JSON.stringify({ email }),
                      });
                      return `Removed ${email}.`;
                    })
                  }
                />
              ) : null}
            </SheetContent>
          </Sheet>
        ) : null}
        </>
      ) : null}

      {desk?.canManage ? (
        <CreateDialog
          open={createOpen}
          kind={createKind}
          files={files}
          projects={desk.projects}
          connected={desk.connected}
          folderId={currentFolderId ?? ""}
          onOpenChange={setCreateOpen}
          onKind={setCreateKind}
          onSubmit={(body) =>
            run(async () => {
              const result = await api<Envelope<DriveFile>>("/documents/files", { method: "POST", body: JSON.stringify(body) });
              setCreated((current) => [result.data, ...current.filter((file) => file.id !== result.data.id)]);
              setCreateOpen(false);
              const parent = files.find((file) => file.id === result.data.folderId && file.kind === "folder");
              if (result.data.accessRole === "owner") {
                setPlace("drive");
                setFolderStack(parent?.accessRole === "owner" && result.data.folderId ? [result.data.folderId] : []);
              }
              setSelectedId(result.data.id);
              return `Added “${body.title}”.`;
            })
          }
        />
      ) : null}
    </div>
  );
}

function PlaceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full min-w-0 items-center gap-2 rounded-full px-3 text-left text-sm",
        active ? "bg-accent font-medium text-accent-foreground" : "text-foreground hover:bg-background",
      )}
    >
      <span className="shrink-0 text-primary [&_svg]:size-4">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full [&_svg]:size-4",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function DriveView({
  folders,
  documents,
  view,
  selectedId,
  downloadingId,
  emptyTitle,
  emptyDescription,
  onSelect,
  onOpenFolder,
  onDownload,
}: {
  folders: DriveFile[];
  documents: DriveFile[];
  view: ViewMode;
  selectedId: string | null;
  downloadingId: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onSelect: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  if (folders.length === 0 && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (view === "list") {
    return (
      <FileTable
        rows={[...folders, ...documents]}
        selectedId={selectedId}
        downloadingId={downloadingId}
        onSelect={onSelect}
        onOpenFolder={onOpenFolder}
        onDownload={onDownload}
      />
    );
  }

  return (
    <div className="@container min-w-0 space-y-6">
      {folders.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">Folders</h2>
          <ul className="grid list-none grid-cols-1 gap-2 p-0 @min-[32rem]:grid-cols-2 @min-[56rem]:grid-cols-3">
            {folders.map((folder) => (
              <li key={folder.id} className="min-w-0">
                <FolderTile
                  file={folder}
                  selected={folder.id === selectedId}
                  onSelect={() => onSelect(folder.id)}
                  onOpen={() => onOpenFolder(folder.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {documents.length > 0 ? (
        <section>
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">Files</h2>
          <ul className="grid list-none grid-cols-1 gap-3 p-0 @min-[24rem]:grid-cols-2 @min-[46rem]:grid-cols-3 @min-[64rem]:grid-cols-4">
            {documents.map((file) => (
              <li key={file.id} className="min-w-0">
                <FileTile
                  file={file}
                  selected={file.id === selectedId}
                  busy={file.id === downloadingId}
                  onSelect={() => onSelect(file.id)}
                  onDownload={() => onDownload(file.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function useFolderGestures(onSelect: () => void, onOpen: () => void) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return {
    onClick() {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        onSelect();
      }, 250);
    },
    onDoubleClick(event: { preventDefault: () => void }) {
      event.preventDefault();
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      onOpen();
    },
  };
}

function FolderOrFileButton({
  file,
  selected,
  disabled,
  onSelect,
  onOpen,
  onDownload,
  children,
}: {
  file: DriveFile;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDownload: () => void;
  children: ReactNode;
}) {
  const gestures = useFolderGestures(onSelect, onOpen);
  const folder = file.kind === "folder";
  return (
    <button
      type="button"
      onClick={folder ? gestures.onClick : onDownload}
      onDoubleClick={folder ? gestures.onDoubleClick : undefined}
      disabled={disabled}
      aria-label={folder ? file.title : `Download ${file.title}`}
      aria-pressed={folder ? selected : undefined}
      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function FolderOrFileRow({
  file,
  selected,
  onSelect,
  onOpen,
  onDownload,
  children,
}: {
  file: DriveFile;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDownload: () => void;
  children: ReactNode;
}) {
  const gestures = useFolderGestures(onSelect, onOpen);
  const folder = file.kind === "folder";
  return (
    <tr
      className={cn("cursor-pointer border-t border-border", selected ? "bg-accent" : "hover:bg-muted/40")}
      onClick={folder ? gestures.onClick : onDownload}
      onDoubleClick={folder ? gestures.onDoubleClick : undefined}
    >
      {children}
    </tr>
  );
}

function FolderTile({
  file,
  selected,
  onSelect,
  onOpen,
}: {
  file: DriveFile;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const gestures = useFolderGestures(onSelect, onOpen);
  return (
    <div className={cn("flex min-w-0 items-center rounded-xl border", selected ? "border-primary bg-accent" : "border-transparent bg-muted/50 hover:bg-muted")}>
      <button
        type="button"
        onClick={gestures.onClick}
        onDoubleClick={gestures.onDoubleClick}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
      >
        <DriveGlyph kind="folder" className="h-6 w-8 shrink-0" />
        <span className="truncate text-sm font-medium">{file.title}</span>
      </button>
      <button type="button" aria-label={`Open ${file.title}`} onClick={onOpen} className="mr-1 grid size-8 place-items-center rounded-full hover:bg-background">
        <ChevronRightIcon className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function FileTile({
  file,
  selected,
  busy,
  onSelect,
  onDownload,
}: {
  file: DriveFile;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onDownload: () => void;
}) {
  return (
    <div className={cn("relative w-full min-w-0 overflow-hidden rounded-xl border bg-card", selected ? "border-primary bg-accent" : "border-border")}>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        aria-label={`Download ${file.title}`}
        className="w-full min-w-0 text-left hover:bg-muted/30 disabled:opacity-60"
      >
        <span className={cn("grid h-28 place-items-center", previewClass(file.kind))}>
          <DriveGlyph kind={file.kind} className="h-14 w-11" />
        </span>
        <span className="flex items-center gap-2 px-3 py-2 pr-10">
          <DriveGlyph kind={file.kind} className="h-4 w-3.5 shrink-0" />
          <span className="truncate text-sm font-medium">{file.title}</span>
        </span>
      </button>
      <DetailsButton label={file.title} pressed={selected} onClick={onSelect} floating />
    </div>
  );
}

function DetailsButton({
  label,
  pressed,
  floating = false,
  onClick,
}: {
  label: string;
  pressed: boolean;
  floating?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Details for ${label}`}
      aria-pressed={pressed}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full hover:bg-background",
        floating && "absolute top-2 right-2 bg-background/80",
      )}
    >
      <InfoIcon className="size-4 text-muted-foreground" />
    </button>
  );
}

function FileTable({
  rows,
  selectedId,
  downloadingId,
  onSelect,
  onOpenFolder,
  onDownload,
}: {
  rows: DriveFile[];
  selectedId: string | null;
  downloadingId: string | null;
  onSelect: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  return (
    <div className="@container min-w-0">
      <ul className="grid list-none gap-2 p-0 @min-[40rem]:hidden">
        {rows.map((file) => (
          <li key={file.id} className="min-w-0">
            <div
              className={cn(
                "flex min-w-0 items-center rounded-xl border",
                file.id === selectedId ? "border-primary bg-accent" : "border-border hover:bg-muted/40",
              )}
            >
              <FolderOrFileButton
                file={file}
                selected={file.id === selectedId}
                disabled={file.id === downloadingId}
                onSelect={() => onSelect(file.id)}
                onOpen={() => onOpenFolder(file.id)}
                onDownload={() => onDownload(file.id)}
              >
                <DriveGlyph kind={file.kind} className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{file.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {file.owner} · {roleLabel(file.accessRole)}
                  </span>
                </span>
              </FolderOrFileButton>
              {file.kind === "folder" ? (
                <button
                  type="button"
                  aria-label={`Open ${file.title}`}
                  onClick={() => onOpenFolder(file.id)}
                  className="mr-1 grid size-8 shrink-0 place-items-center rounded-full hover:bg-background"
                >
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              ) : (
                <DetailsButton label={file.title} pressed={file.id === selectedId} onClick={() => onSelect(file.id)} />
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border @min-[40rem]:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="w-36 px-3 py-2 font-medium">Owner</th>
              <th className="w-32 px-3 py-2 font-medium">Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((file) => (
              <FolderOrFileRow
                key={file.id}
                file={file}
                selected={file.id === selectedId}
                onSelect={() => onSelect(file.id)}
                onOpen={() => onOpenFolder(file.id)}
                onDownload={() => onDownload(file.id)}
              >
                <td className="px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <DriveGlyph kind={file.kind} className="h-5 w-5 shrink-0" />
                    <span className="truncate font-medium">{file.title}</span>
                    {file.kind === "folder" ? null : (
                      <DetailsButton label={file.title} pressed={file.id === selectedId} onClick={() => onSelect(file.id)} />
                    )}
                  </span>
                </td>
                <td className="truncate px-3 py-2.5 text-muted-foreground">{file.owner}</td>
                <td className="truncate px-3 py-2.5 text-muted-foreground">{roleLabel(file.accessRole)}</td>
              </FolderOrFileRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileDetails({
  file,
  canManage,
  framed = true,
  downloading = false,
  onClose,
  onOpenFolder,
  onDownload,
  onShare,
  onUnshare,
}: {
  file: DriveFile;
  canManage: boolean;
  framed?: boolean;
  downloading?: boolean;
  onClose: () => void;
  onOpenFolder: () => void;
  onDownload: () => void;
  onShare: (email: string, role: Exclude<DriveRole, "owner">) => void;
  onUnshare: (email: string) => void;
}) {
  const canShare = canManage && (file.accessRole === "owner" || file.accessRole === "writer");
  return (
    <aside
      className={cn(
        "min-w-0 bg-muted/20 px-4 py-4",
        framed ? "border-t border-border lg:border-t-0 lg:border-l" : "pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <DriveGlyph kind={file.kind} className="mt-0.5 h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold break-words">{file.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{kindLabel(file.kind)}</p>
          </div>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-muted">
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {file.kind === "folder" ? (
          <Button type="button" size="sm" onClick={onOpenFolder}>
            Open
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onDownload} disabled={downloading}>
            {downloading ? "Downloading…" : "Download"}
          </Button>
        )}
        {file.href ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={file.href} target="_blank" rel="noreferrer">
              Open in Drive
            </a>
          </Button>
        ) : null}
      </div>
      <dl className="grid gap-3 text-sm">
        <Detail label="Owner" value={file.owner} />
        <Detail label="Location" value={file.folderName} />
        <Detail label="Your access" value={roleLabel(file.accessRole)} />
        <div>
          <dt className="text-xs text-muted-foreground">Project</dt>
          <dd className="mt-0.5">
            {file.projectId ? (
              <Link to={`/projects/${file.projectId}`} className="underline-offset-4 hover:underline">
                {file.projectName}
              </Link>
            ) : (
              file.projectName || "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Source</dt>
          <dd className="mt-1">
            <SourceBadge origin={file.source.origin} />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{file.source.detail}</p>
          </dd>
        </div>
      </dl>
      {file.reviewFlags.length > 0 ? (
        <ul className="mt-4 grid gap-1 text-xs leading-5 text-[var(--origin-review-fg)]">
          {file.reviewFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}
      <h3 className="mt-5 text-xs font-medium text-muted-foreground">People with access</h3>
      {file.shares.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {file.source.origin === "live"
            ? "People with access are managed in Drive."
            : canManage
              ? "Not shared with anyone else."
              : "The sharing list is hidden for your role."}
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {file.shares.map((share) => (
            <li key={share.email} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{share.email}</span>
                <span className="text-xs text-muted-foreground">{roleLabel(share.role)}</span>
              </span>
              {canShare && share.role !== "owner" ? (
                <Button type="button" variant="ghost" size="xs" onClick={() => onUnshare(share.email)}>
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canShare ? <ShareForm onSubmit={onShare} /> : null}
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value || "—"}</dd>
    </div>
  );
}

function CreateDialog({
  open,
  kind,
  files,
  projects,
  connected,
  folderId,
  onOpenChange,
  onKind,
  onSubmit,
}: {
  open: boolean;
  kind: CreateKind;
  files: DriveFile[];
  projects: { id: string; name: string }[];
  connected: boolean;
  folderId: string;
  onOpenChange: (open: boolean) => void;
  onKind: (kind: CreateKind) => void;
  onSubmit: (body: { title: string; kind: CreateKind; folderId: string; projectId: string }) => void;
}) {
  const folders = files.filter((file) => file.kind === "folder" && (file.accessRole === "owner" || file.accessRole === "writer"));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextKind = String(form.get("kind") ?? "document");
    onSubmit({
      title: String(form.get("title") ?? ""),
      kind: nextKind === "folder" || nextKind === "spreadsheet" ? nextKind : "document",
      folderId: String(form.get("folderId") ?? ""),
      projectId: connected ? "" : String(form.get("projectId") ?? ""),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85dvh,40rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New</DialogTitle>
          <DialogDescription>Add an empty folder, Doc, or Sheet. The contents stay in Drive.</DialogDescription>
        </DialogHeader>
        <form key={`${folderId}-${open}`} className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            Name
            <Input name="title" required maxLength={140} placeholder="Team access notes" autoFocus />
          </label>
          <label className="grid gap-1 text-sm">
            Type
            <select name="kind" className={fieldClass} value={kind} onChange={(event) => onKind(event.target.value as CreateKind)}>
              <option value="folder">Folder</option>
              <option value="document">Google Doc</option>
              <option value="spreadsheet">Google Sheet</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Location
            <select name="folderId" className={fieldClass} defaultValue={folderId}>
              <option value="">My Drive</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title}
                </option>
              ))}
            </select>
          </label>
          {connected ? null : (
            <label className="grid gap-1 text-sm">
              Project
              <select name="projectId" className={fieldClass} defaultValue="">
                <option value="">No project</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <form className="mt-3 grid gap-2 border-t border-border pt-3" onSubmit={submit}>
      <Input name="email" type="email" required placeholder="person@impactone.example" aria-label="Person to share with" />
      <select name="role" className={fieldClass} defaultValue="reader" aria-label="Sharing permission">
        <option value="writer">Can edit</option>
        <option value="commenter">Can comment</option>
        <option value="reader">Can view</option>
      </select>
      <Button type="submit" variant="outline">
        Share
      </Button>
    </form>
  );
}

function DriveGlyph({ kind, className }: { kind: DriveKind; className?: string }) {
  if (kind === "folder") {
    return (
      <svg viewBox="0 0 40 32" className={className} aria-hidden="true">
        <path d="M2 10a4 4 0 0 1 4-4h9l3 4h16a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10z" fill="#E8B000" />
        <path d="M2 14h36v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-8z" fill="#F6C945" />
      </svg>
    );
  }
  const accent = kind === "spreadsheet" ? "#188038" : kind === "document" ? "#1A73E8" : "#5F6368";
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden="true">
      <path d="M6 2h14l8 8v26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke={accent} strokeWidth="1.5" />
      <path d="M20 2v8h8" fill="none" stroke={accent} strokeWidth="1.5" />
      {kind === "spreadsheet" ? (
        <>
          <path d="M8 18h16M8 24h16M8 30h16M14 16v16M20 16v16" stroke={accent} strokeWidth="1.2" />
        </>
      ) : (
        <>
          <path d="M8 18h16M8 23h16M8 28h10" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function previewClass(kind: DriveKind) {
  if (kind === "spreadsheet") return "bg-[#E6F4EA]";
  if (kind === "document") return "bg-[#E8F0FE]";
  return "bg-muted/50";
}

function matches(
  item: { title: string; owner: string; projectName: string; source: { origin: Origin; detail: string }; reviewFlags: string[] },
  query: string,
  project: string,
  origin: Origin | "all",
  needsReview: boolean,
) {
  const haystack = `${item.title} ${item.owner} ${item.projectName} ${item.source.detail}`.toLowerCase();
  if (query && !haystack.includes(query.toLowerCase())) return false;
  if (project !== "all" && item.projectName !== project) return false;
  if (origin !== "all" && item.source.origin !== origin) return false;
  if (needsReview && item.reviewFlags.length === 0) return false;
  return true;
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
