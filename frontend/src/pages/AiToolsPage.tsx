import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRightIcon,
  AudioLinesIcon,
  BotIcon,
  BoxesIcon,
  MicIcon,
  SparklesIcon,
  SquareTerminalIcon,
  WorkflowIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterOrigin, FilterSearch, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardsSkeleton } from "../components/PageSkeleton";
import { CardGrid, MetricStrip, RecordCard } from "../components/Surface";
import { plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { AiCatalog, AiTool, Envelope, Origin } from "../types";

function toolPath(name: string): string | null {
  const key = name.toLowerCase();
  if (key.includes("otter")) return "/ai/otter";
  if (key.includes("chatgpt")) return "/ai/chatgpt";
  if (key.includes("claude")) return "/ai/claude";
  return null;
}

function ToolCard({ tool }: { tool: AiTool }) {
  const Icon = toolIcon(tool.name);
  const to = toolPath(tool.name);
  const card = (
    <RecordCard
      kicker={plainStatus(tool.kind)}
      title={
        to ? (
          <span className="inline-flex items-center gap-1">
            {tool.name}
            <ArrowUpRightIcon className="size-3.5 text-primary" />
          </span>
        ) : (
          tool.name
        )
      }
      origin={tool.source.origin}
      summary={tool.purpose}
      mark={<Icon className="size-4" />}
      fields={[
        { label: "Owner", value: tool.owner },
        { label: "Connections", value: tool.connections, wide: true },
        { label: "Source", value: tool.source.detail, wide: true },
      ]}
      flags={tool.reviewFlags}
    />
  );

  return (
    <li>
      {to ? (
        <Link
          to={to}
          aria-label={`Open ${tool.name}`}
          className="block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {card}
        </Link>
      ) : (
        card
      )}
    </li>
  );
}

function toolIcon(name: string): ComponentType<{ className?: string }> {
  const key = name.toLowerCase();
  if (key.includes("otter")) return AudioLinesIcon;
  if (key.includes("chatgpt")) return SparklesIcon;
  if (key.includes("claude")) return BotIcon;
  if (key.includes("cursor")) return SquareTerminalIcon;
  if (key.includes("plaud")) return MicIcon;
  if (key.includes("make")) return WorkflowIcon;
  return BoxesIcon;
}

export function AiToolsPage() {
  const { data, error, loading, reload } = useApi<Envelope<AiCatalog>>("/ai-tools");
  const catalog = data?.data;
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [needsReview, setNeedsReview] = useState(false);

  const tools = catalog?.tools ?? [];
  const visible = useMemo(() => {
    return tools.filter((tool) => {
      const haystack = `${tool.name} ${tool.purpose} ${tool.owner}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (origin !== "all" && tool.source.origin !== origin) return false;
      if (needsReview && tool.source.origin !== "needs-review") return false;
      return true;
    });
  }, [tools, query, origin, needsReview]);

  const openHere = tools.filter((tool) => toolPath(tool.name)).length;
  const unconfirmed = tools.filter((tool) => tool.source.origin === "needs-review").length;
  const proposed = tools.filter((tool) => tool.kind === "proposed").length;

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI tools and agents"
        lede="Catalogue of AI tools in use, with gaps flagged where purpose or ownership still needs confirmation."
      />
      {loading && !catalog ? <CardsSkeleton label="Loading AI tools" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? (
        <div className="mb-6">
          <Note>{data.meta.note}</Note>
        </div>
      ) : null}
      {catalog ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              {
                label: "Catalogue",
                value: tools.length,
                hint: "Tools named for this pilot.",
                icon: <BoxesIcon />,
              },
              {
                label: "Open here",
                value: openHere,
                hint: "Otter, ChatGPT, and Claude.",
                icon: <SparklesIcon />,
                tone: "good",
              },
              {
                label: "Unconfirmed",
                value: unconfirmed,
                hint: "Listed, but how they are used is still open.",
                icon: <MicIcon />,
                tone: unconfirmed > 0 ? "warn" : "muted",
              },
              {
                label: "Proposed",
                value: proposed,
                hint: "Evaluation only. Not installed.",
                icon: <WorkflowIcon />,
                tone: "muted",
              },
            ]}
          />
          <FilterBar>
            <FilterSearch id="ai-search" label="Search tools" value={query} onChange={setQuery} />
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
          <ResultCount shown={visible.length} total={tools.length} label="tools" />
          {visible.length === 0 ? (
            <EmptyState title="No tools match" description="Clear filters to see the full catalogue." />
          ) : (
            <CardGrid>
              {visible.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </CardGrid>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/map">Automation map</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
