import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export type ChartDatum = { name: string; value: number; fill?: string };

function useMediaFlag(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setMatches(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);
  return matches;
}

function useChartMotion() {
  return !useMediaFlag("(prefers-reduced-motion: reduce)");
}

function shortLabel(value: string, max = 12) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; payload?: ChartDatum }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload?.name ?? label ?? payload[0]?.name;
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs shadow-lg">
      <p className="max-w-[14rem] font-medium break-words text-foreground">{full}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">{payload[0]?.value ?? 0}</p>
    </div>
  );
}

function ChartFrame({
  children,
  className,
  compact,
  fixedHeight,
}: {
  children: (size: { narrow: boolean; height: number; animate: boolean }) => ReactNode;
  className?: string;
  compact?: boolean;
  fixedHeight?: number;
}) {
  const narrow = useMediaFlag("(max-width: 639px)");
  const animate = useChartMotion();
  const height = fixedHeight ?? (compact ? (narrow ? 200 : 220) : narrow ? 240 : 280);

  return (
    <div className={cn("relative w-full min-w-0", className)} style={{ height }} role="img">
      {children({ narrow, height, animate })}
    </div>
  );
}

export function ChartRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5", className)}>{children}</div>;
}

export function ChartPanel({
  title,
  action,
  children,
  className,
  description,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <Card className={cn("surface min-w-0 gap-0 overflow-hidden rounded-2xl border-0 bg-card py-0 shadow-none ring-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/50 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle>
          {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="min-w-0 px-5 pt-4 pb-5">{children}</CardContent>
    </Card>
  );
}

/** Mini sparkline for KPI cards — stroke-forward, soft wash underneath. */
export function SoftSparkline({ values, className }: { values: number[]; className?: string }) {
  const gradientId = useId().replace(/:/g, "");
  const data = values.map((value, index) => ({ name: String(index), value }));
  if (!values.length || values.every((v) => v === 0)) {
    return <div className={cn("h-6 w-full rounded-md bg-muted/35", className)} />;
  }
  const peak = Math.max(...values, 1);
  return (
    <div className={cn("h-6 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, peak * 1.45]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinecap="round"
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SoftAreaChart({ data, height, compact }: { data: ChartDatum[]; height?: number; compact?: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  if (data.every((d) => d.value === 0)) return <EmptyChart />;

  return (
    <ChartFrame compact={compact} fixedHeight={height}>
      {({ narrow, animate }) => (
        <div className="absolute inset-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={40} minWidth={0}>
            <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value: string) => shortLabel(String(value), narrow ? 7 : 12)}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-2)", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={animate}
                animationDuration={700}
                dot={{ r: 3.5, fill: "var(--card)", stroke: "var(--chart-1)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}

export function SoftBarChart({
  data,
  height,
  compact,
  layout = "horizontal",
}: {
  data: ChartDatum[];
  height?: number;
  compact?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  if (data.every((d) => d.value === 0)) return <EmptyChart />;

  return (
    <ChartFrame compact={compact} fixedHeight={height}>
      {({ narrow, animate }) => {
        const horizontal = layout === "horizontal";
        const chartData = data.map((item) => ({
          ...item,
          label: shortLabel(item.name, horizontal ? 18 : 12),
        }));

        return (
          <div className="absolute inset-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" debounce={40} minWidth={0}>
              {horizontal ? (
                <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={narrow ? 78 : 108}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.55 }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={26} isAnimationActive={animate} animationDuration={550}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.55 }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={48} isAnimationActive={animate} animationDuration={550}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        );
      }}
    </ChartFrame>
  );
}

export function SoftDonutChart({
  data,
  centerLabel = "Total",
  compact,
}: {
  data: ChartDatum[];
  centerLabel?: string;
  compact?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const animate = useChartMotion();
  if (!total) return <EmptyChart />;

  return (
    <div className={cn("flex w-full min-w-0 flex-col items-center gap-5", compact ? "py-1" : "py-2")}>
      <div className={cn("relative shrink-0", compact ? "size-[160px]" : "size-[188px]")}>
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%" debounce={40} minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="92%"
                paddingAngle={3}
                stroke="var(--card)"
                strokeWidth={4}
                isAnimationActive={animate}
                animationDuration={650}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{total}</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{centerLabel}</p>
            </div>
          </div>
        </div>
      </div>
      <ul className="grid w-full gap-2">
        {data.map((item, index) => {
          const pct = Math.round((item.value / total) * 100);
          const color = item.fill ?? CHART_COLORS[index % CHART_COLORS.length];
          return (
            <li key={item.name} className="flex min-w-0 items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={item.name}>
                {item.name}
              </span>
              <span className="text-sm tabular-nums font-semibold text-foreground">{item.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Radar / spider chart — multi-metric snapshot. */
export function SoftRadarChart({ data }: { data: ChartDatum[] }) {
  const animate = useChartMotion();
  if (data.every((d) => d.value === 0)) return <EmptyChart />;

  return (
    <ChartFrame>
      {() => (
        <div className="absolute inset-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={40} minWidth={0}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={animate}
              />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}

/** Progress-track list (activity / distribution UI type). */
export function SoftProgressTracks({ data }: { data: ChartDatum[] }) {
  const total = Math.max(...data.map((d) => d.value), 1);
  if (data.every((d) => d.value === 0)) return <EmptyChart />;

  return (
    <ul className="space-y-4">
      {data.map((item, index) => {
        const pct = Math.round((item.value / total) * 100);
        const color = item.fill ?? CHART_COLORS[index % CHART_COLORS.length];
        return (
          <li key={item.name} className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(pct, 4)}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DistributionList({ data }: { data: ChartDatum[] }) {
  return <SoftProgressTracks data={data} />;
}

function EmptyChart() {
  return (
    <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 text-center">
      <p className="text-sm text-muted-foreground">No data for this chart yet.</p>
    </div>
  );
}

export function countBy<T>(items: T[], key: (item: T) => string): ChartDatum[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const name = key(item) || "Unknown";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Fake-but-stable sparkline values from a seed count (visual only). */
export function sparkFromValue(value: number, points = 10): number[] {
  const base = Math.max(value, 2);
  return Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(points - 1, 1);
    const wave = Math.sin(i * 0.95 + base * 0.35) * 0.28;
    const rise = 0.72 + t * 0.38;
    return Math.max(1, Math.round(base * (rise + wave)));
  });
}
