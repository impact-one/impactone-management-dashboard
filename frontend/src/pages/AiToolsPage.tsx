import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  AudioLinesIcon,
  BotIcon,
  BoxesIcon,
  MicIcon,
  SparklesIcon,
  SquareTerminalIcon,
  WorkflowIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  countBy,
} from "../components/charts";
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterOrigin, FilterSearch, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardsSkeleton } from "../components/PageSkeleton";
import { CardGrid, MetricStrip, RecordCard, Section } from "../components/Surface";
import { plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { AiCatalog, Envelope, Origin } from "../types";

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
      if (needsReview && tool.reviewFlags.length === 0 && tool.source.origin !== "needs-review") return false;
      return true;
    });
  }, [tools, query, origin, needsReview]);

  const reviewCount =
    catalog?.tools.filter((tool) => tool.reviewFlags.length > 0 || tool.source.origin === "needs-review").length ?? 0;
  const kindMix = useMemo(() => countBy(tools, (tool) => plainStatus(tool.kind)), [tools]);
  const originMix = useMemo(
    () =>
      countBy(tools, (tool) => {
        if (tool.source.origin === "live") return "Live";
        if (tool.source.origin === "sample") return "Sample";
        if (tool.source.origin === "documented") return "Documented";
        return "Needs review";
      }),
    [tools],
  );

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
              { label: "Tools", value: catalog.tools.length, icon: <BoxesIcon /> },
              { label: "To review", value: reviewCount, icon: <SparklesIcon /> },
              { label: "Visible", value: visible.length, icon: <BotIcon /> },
              { label: "Kinds", value: kindMix.length, icon: <WorkflowIcon /> },
              { label: "Owners", value: new Set(tools.map((tool) => tool.owner)).size, icon: <MicIcon /> },
            ]}
          />
          <ChartRow>
            <ChartPanel title="Tool kinds" className="lg:col-span-5">
              <SoftBarChart data={kindMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="Source mix" className="lg:col-span-3">
              <SoftDonutChart data={originMix} centerLabel="Sources" compact />
            </ChartPanel>
            <ChartPanel title="Kind tracks" className="lg:col-span-4">
              <SoftProgressTracks data={kindMix} />
            </ChartPanel>
          </ChartRow>
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
              {visible.map((tool) => {
                const Icon = toolIcon(tool.name);
                return (
                  <li key={tool.id}>
                    <RecordCard
                      kicker={plainStatus(tool.kind)}
                      title={tool.name}
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
                  </li>
                );
              })}
            </CardGrid>
          )}
          <Section title="Agents">
            <EmptyState title="No agents named" description={catalog.agentNote} />
          </Section>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/assistant">Open ChatGPT assistant</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/claude">Open Claude</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pilot#librechat">LibreChat evaluation</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/map">Automation map</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
