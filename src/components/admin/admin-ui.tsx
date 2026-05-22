"use client";

import { CSSProperties, ReactNode, useState } from "react";
import { AdminOverview } from "@/lib/types";

const USD_TO_IDR = 16250;

export function Panel({
    eyebrow,
    title,
    subtitle,
    children,
    action,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <section className="min-w-0 overflow-hidden rounded-[20px] border border-black/5 bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    {eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
                    ) : null}
                    <h2 className=" text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
                    {subtitle ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </section>
    );
}

export function HeroStat({
    label,
    value,
    meta,
}: {
    label: string;
    value: string;
    meta: string;
    tone?: "revenue" | "neutral" | "alert" | "calm";
}) {
    return (
        <div className="rounded-[16px] border border-black/5 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        </div>
    );
}

export function SummaryCard({
    title,
    value,
    meta,
}: {
    title: string;
    value: string;
    meta: string;
    tone?: "revenue" | "cool" | "neutral" | "calm";
}) {
    return (
        <div className="rounded-[16px] border border-black/5 bg-white px-4 py-4">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums] sm:text-3xl">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        </div>
    );
}

const STATUS_PILL_TONES = {
    calm: {
        bg: "var(--status-done-bg)",
        fg: "var(--status-done-fg)",
        border: "var(--status-done-border)",
    },
    alert: {
        bg: "var(--danger-bg)",
        fg: "var(--danger-fg)",
        border: "var(--danger-border)",
    },
    revenue: {
        bg: "var(--status-in-progress-bg)",
        fg: "var(--status-in-progress-fg)",
        border: "var(--status-in-progress-border)",
    },
    slate: {
        bg: "var(--status-todo-bg)",
        fg: "var(--status-todo-fg)",
        border: "var(--status-todo-border)",
    },
    warning: {
        bg: "var(--warning-bg)",
        fg: "var(--warning-fg)",
        border: "var(--warning-border)",
    },
} as const;

export function StatusPill({
    tone,
    label,
}: {
    tone: "calm" | "alert" | "revenue" | "slate" | "warning";
    label: string;
}) {
    const palette = STATUS_PILL_TONES[tone] ?? STATUS_PILL_TONES.slate;
    return (
        <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ backgroundColor: palette.bg, color: palette.fg, borderColor: palette.border }}
        >
            {label}
        </span>
    );
}

export function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[14px] border border-black/5 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-base font-semibold text-foreground [font-variant-numeric:tabular-nums]">{value}</p>
        </div>
    );
}

export function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
    return (
        <div
            className={`rounded-[14px] border border-dashed border-black/10 bg-white text-center text-sm text-muted-foreground ${
                compact ? "px-4 py-6" : "px-5 py-10"
            }`}
        >
            {message}
        </div>
    );
}

export function SearchField({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 w-full rounded-[12px] border border-border bg-white px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
    );
}

export function PaginationControls({
    page,
    totalPages,
    totalItems,
    label,
    onChange,
}: {
    page: number;
    totalPages: number;
    totalItems: number;
    label: string;
    onChange: (page: number) => void;
}) {
    const safeTotalPages = Math.max(totalPages, 1);

    return (
        <div className="flex flex-col gap-3 rounded-[12px] border border-black/5 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Page {page} of {safeTotalPages} · {formatNumber(totalItems)} {label}
            </p>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => onChange(Math.min(safeTotalPages, page + 1))}
                    disabled={page >= safeTotalPages}
                    className="rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
            <input
                name={label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                autoComplete="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-[12px] border border-border bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
        </label>
    );
}

export function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
            <input
                type="number"
                name={label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                inputMode="decimal"
                autoComplete="off"
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-11 w-full rounded-[12px] border border-border bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 [font-variant-numeric:tabular-nums]"
            />
        </label>
    );
}

const CHART_PRIMARY = "var(--primary)";
const CHART_SECONDARY = "var(--muted-foreground)";

export function DualBarChart({ data }: { data: AdminOverview["daily_registrations"] }) {
    const hasData = data.some((item) => item.users > 0 || item.teams > 0);
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.users, item.teams]));

    if (!hasData) {
        return (
            <EmptyState
                compact
                message="No registrations in this window yet. The chart fills in as new users and teams sign up."
            />
        );
    }

    const lastIdx = Math.max(0, data.length - 1);
    const labelStops =
        data.length <= 8
            ? data.map((_item, idx) => idx)
            : [0, Math.round(lastIdx / 3), Math.round((lastIdx * 2) / 3), lastIdx];

    return (
        <div>
            <div className="mb-4 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_PRIMARY }} />
                    Users
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_SECONDARY }} />
                    Teams
                </span>
            </div>
            <div className="flex h-44 items-end gap-1 overflow-hidden rounded-[14px] border border-black/5 bg-white px-3 pb-3 pt-5">
                {data.map((item) => (
                    <div key={item.label} className="flex h-32 min-w-0 flex-1 items-end justify-center gap-0.5">
                        <div
                            className="w-1.5 rounded-t-full"
                            style={{
                                height: `${Math.max((item.users / maxValue) * 100, item.users > 0 ? 4 : 0)}%`,
                                backgroundColor: CHART_PRIMARY,
                            }}
                        />
                        <div
                            className="w-1.5 rounded-t-full"
                            style={{
                                height: `${Math.max((item.teams / maxValue) * 100, item.teams > 0 ? 4 : 0)}%`,
                                backgroundColor: CHART_SECONDARY,
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                {labelStops.map((idx) => (
                    <span key={idx}>{data[idx]?.label}</span>
                ))}
            </div>
        </div>
    );
}

export function DualLineChart({ data }: { data: AdminOverview["monthly_registrations"] }) {
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.users, item.teams]));
    const buildPath = (key: "users" | "teams") =>
        data
            .map((point, index) => {
                const x = (index / Math.max(data.length - 1, 1)) * 100;
                const y = 100 - ((point[key] || 0) / maxValue) * 100;
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

    return (
        <div>
            <div className="rounded-[14px] border border-black/5 bg-white p-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full overflow-visible">
                    <path d={buildPath("users")} fill="none" stroke={CHART_PRIMARY} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                    <path d={buildPath("teams")} fill="none" stroke={CHART_SECONDARY} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-muted-foreground sm:grid-cols-6 md:grid-cols-12">
                {data.map((point, idx) => {
                    const showLabel = data.length <= 12 || idx % Math.ceil(data.length / 12) === 0;
                    return (
                        <div key={point.label} className="block min-w-0 truncate">
                            {showLabel ? point.label : " "}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_PRIMARY }} />
                    Users
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_SECONDARY }} />
                    Teams
                </span>
            </div>
        </div>
    );
}

export function StackedTrend({
    primary,
    secondary,
    primaryLabel,
    secondaryLabel,
}: {
    primary: { label: string; value: number }[];
    secondary: { label: string; value: number }[];
    primaryLabel: string;
    secondaryLabel: string;
}) {
    const maxValue = Math.max(1, ...primary.map((point) => point.value), ...secondary.map((point) => point.value));
    const buildPath = (points: { label: string; value: number }[]) =>
        points
            .map((point, index) => {
                const x = (index / Math.max(points.length - 1, 1)) * 100;
                const y = 100 - (point.value / maxValue) * 100;
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

    return (
        <div>
            <div className="rounded-[14px] border border-black/5 bg-white p-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full overflow-visible">
                    <path d={buildPath(primary)} fill="none" stroke={CHART_PRIMARY} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                    <path d={buildPath(secondary)} fill="none" stroke={CHART_SECONDARY} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-muted-foreground sm:grid-cols-6 md:grid-cols-12">
                {primary.map((point, idx) => {
                    const showLabel = primary.length <= 12 || idx % Math.ceil(primary.length / 12) === 0;
                    return (
                        <div key={point.label} className="block min-w-0 truncate">
                            {showLabel ? point.label : " "}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_PRIMARY }} />
                    {primaryLabel}
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_SECONDARY }} />
                    {secondaryLabel}
                </span>
            </div>
        </div>
    );
}

export function DonutSplit({ free, paid }: { free: number; paid: number }) {
    const total = Math.max(free + paid, 1);
    const freePercentage = (free / total) * 100;
    const paidPercentage = 100 - freePercentage;

    return (
        <div className="flex flex-col items-center gap-5 py-2">
            <div
                className="grid h-44 w-44 place-items-center rounded-full"
                style={{
                    background: `conic-gradient(${CHART_PRIMARY} 0 ${paidPercentage}%, var(--muted) ${paidPercentage}% 100%)`,
                }}
            >
                <div className="grid h-[124px] w-[124px] place-items-center rounded-full bg-white text-center">
                    <div>
                        <div className=" text-2xl font-semibold text-foreground [font-variant-numeric:tabular-nums]">{total}</div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Teams</div>
                    </div>
                </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
                <Metric label={`Paid ${paidPercentage.toFixed(0)}%`} value={formatNumber(paid)} />
                <Metric label={`Free ${freePercentage.toFixed(0)}%`} value={formatNumber(free)} />
            </div>
        </div>
    );
}

export function QuotaChart({ data }: { data: AdminOverview["quota_usage_trend"] }) {
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.ai_tokens, item.whatsapp_messages]));

    return (
        <div className="space-y-3">
            {data.map((point) => (
                <div key={point.label} className="rounded-[14px] border border-black/5 bg-white p-4">
                    <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{point.label}</span>
                        <span className="[font-variant-numeric:tabular-nums]">
                            {formatCompactNumber(point.ai_tokens)} AI · {formatCompactNumber(point.whatsapp_messages)} WA
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${(point.ai_tokens / maxValue) * 100}%`, backgroundColor: CHART_PRIMARY }} />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${(point.whatsapp_messages / maxValue) * 100}%`, backgroundColor: CHART_SECONDARY }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function BarList({ items }: { items: { label: string; value: number }[] }) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="space-y-2.5">
            {items.length === 0 ? (
                <EmptyState message="Project distribution will appear here once teams create projects." compact />
            ) : (
                items.map((item) => (
                    <div key={item.label} className="rounded-[14px] border border-black/5 bg-white p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm text-foreground">
                            <span className="truncate font-medium">{item.label}</span>
                            <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: CHART_PRIMARY }} />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export function toDisplayIdr(value: number, currency = "USD") {
    if (!value) return 0;
    return currency.toUpperCase() === "IDR" ? value : value * USD_TO_IDR;
}

export function formatCurrencyIdr(value: number, currency = "USD") {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(toDisplayIdr(value, currency));
}

export function formatDate(value?: string) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function formatNumber(value: number) {
    return new Intl.NumberFormat("id-ID").format(value || 0);
}

export function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("id-ID", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value || 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Skeleton primitives
//
// Three building blocks that every admin page should use for "data is on its
// way" feedback. They share one shimmer atom so we can adjust timing, tone,
// and reduced-motion behavior in exactly one place.
// ────────────────────────────────────────────────────────────────────────────

type SkeletonRounded = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const SKELETON_ROUNDED: Record<SkeletonRounded, string> = {
    sm: "rounded-md",
    md: "rounded-[12px]",
    lg: "rounded-[16px]",
    xl: "rounded-[20px]",
    "2xl": "rounded-[24px]",
    full: "rounded-full",
};

type SkeletonProps = {
    className?: string;
    rounded?: SkeletonRounded;
    height?: number | string;
    width?: number | string;
};

// Skeleton is the atomic shimmer block. Defaults to a soft tinted neutral
// surface that matches the rest of the admin UI; pass className to override.
export function Skeleton({ className = "", rounded = "lg", height, width }: SkeletonProps) {
    const style: CSSProperties = {};
    if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
    if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;

    return (
        <div
            aria-hidden
            style={style}
            className={
                `animate-pulse bg-muted motion-reduce:animate-none ${SKELETON_ROUNDED[rounded]} ${className}`.trim()
            }
        />
    );
}

// SkeletonRows renders a vertical stack of card-shaped skeletons sized to
// match list rows used across the admin section. Override `rowHeight` per
// page so the swap to real content lands without layout shift.
export function SkeletonRows({
    count,
    rowHeight = 112,
    gap = "sm",
    className = "",
}: {
    count: number;
    rowHeight?: number;
    gap?: "xs" | "sm" | "md";
    className?: string;
}) {
    const gapClass = gap === "xs" ? "space-y-1.5" : gap === "md" ? "space-y-3" : "space-y-2";
    return (
        <div className={`${gapClass} ${className}`.trim()}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    style={{ height: rowHeight }}
                    aria-hidden
                    className="animate-pulse rounded-[16px] border border-black/5 bg-white motion-reduce:animate-none"
                />
            ))}
        </div>
    );
}

// SkeletonHeroStatGrid mirrors the 4-card HeroStat row used at the top of
// metric-heavy pages. Default `count` is 4; pass a smaller value when the
// page only renders 2 or 3 stats.
export function SkeletonHeroStatGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    aria-hidden
                    className="h-24 animate-pulse rounded-[16px] border border-black/5 bg-white motion-reduce:animate-none"
                />
            ))}
        </div>
    );
}

// StackedBarPoint feeds StackedBarChart. `segments` order is fixed by the
// caller and corresponds to vertical stacking from bottom to top (segments[0]
// sits at the base of each bar). Bars whose total is zero render as empty
// space — the chart auto-detects "no data" via points[].total.
export type StackedBarPoint = {
    bucket: string;
    total: number;
    totalCalls?: number;
    label: string;       // X-axis label, e.g. "May 5" or "14:00"
    fullLabel?: string;  // longer hover label, e.g. "May 5, 2026 · 14:00"
    segments: Array<{ key: string; label: string; value: number; color: string }>;
};

// StackedBarChart renders one bar per point with vertically stacked colored
// segments. Pure CSS / flex; no SVG. Bars share the global y-axis (max of
// every point's total) so bucket heights are comparable. A custom tooltip
// floats above the hovered bar with the bucket label, totals, and the full
// per-feature breakdown (zero rows dimmed, not omitted).
//
// X-axis labels are sampled when there are too many points to fit; the
// fixed stops mirror DualBarChart so the visual rhythm stays consistent.
export function StackedBarChart({ points, height = 240 }: { points: StackedBarPoint[]; height?: number }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const hasData = points.some((p) => p.total > 0);
    if (!hasData) {
        return <EmptyState compact message="No token activity in this range yet." />;
    }

    const max = Math.max(1, ...points.map((p) => p.total));
    const lastIdx = Math.max(0, points.length - 1);
    const labelStops =
        points.length <= 14
            ? points.map((_p, idx) => idx)
            : Array.from(
                  new Set([
                      0,
                      Math.round(lastIdx / 4),
                      Math.round(lastIdx / 2),
                      Math.round((lastIdx * 3) / 4),
                      lastIdx,
                  ]),
              );
    const labelStopSet = new Set(labelStops);

    return (
        <div>
            <div
                // overflow-visible so the absolute-positioned tooltip can
                // extend above the chart frame; the inner bars keep their
                // own rounded-md so visuals stay clean.
                className="flex items-end gap-1 rounded-[14px] border border-black/5 bg-white px-3 pb-3 pt-5"
                style={{ height }}
            >
                {points.map((point, idx) => (
                    <div
                        key={point.bucket}
                        className="relative flex h-full min-w-0 flex-1 flex-col-reverse"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() =>
                            setHoveredIdx((curr) => (curr === idx ? null : curr))
                        }
                    >
                        <div className="flex h-full w-full flex-col-reverse overflow-hidden rounded-md">
                            {point.segments.map((seg) => {
                                if (seg.value <= 0) return null;
                                const heightPct = (seg.value / max) * 100;
                                return (
                                    <div
                                        key={seg.key}
                                        style={{
                                            height: `${heightPct}%`,
                                            backgroundColor: seg.color,
                                            minHeight: 1,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        {hoveredIdx === idx ? (
                            <ChartTooltip point={point} alignToEdge={alignTooltip(idx, points.length)} />
                        ) : null}
                    </div>
                ))}
            </div>
            <div className="mt-2 flex gap-1 px-3 text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                {points.map((point, idx) => (
                    <div key={point.bucket} className="min-w-0 flex-1 text-center">
                        {labelStopSet.has(idx) ? point.label : ""}
                    </div>
                ))}
            </div>
        </div>
    );
}

// alignTooltip biases the tooltip horizontally for bars near the chart's
// edges so it doesn't get clipped on the page.
function alignTooltip(idx: number, total: number): "start" | "center" | "end" {
    if (total <= 1) return "center";
    const ratio = idx / (total - 1);
    if (ratio < 0.15) return "start";
    if (ratio > 0.85) return "end";
    return "center";
}

function ChartTooltip({
    point,
    alignToEdge,
}: {
    point: StackedBarPoint;
    alignToEdge: "start" | "center" | "end";
}) {
    const horizontalClass =
        alignToEdge === "start"
            ? "left-0"
            : alignToEdge === "end"
              ? "right-0"
              : "left-1/2 -translate-x-1/2";

    return (
        <div
            role="tooltip"
            className={
                "pointer-events-none absolute bottom-full z-20 mb-2 w-56 rounded-xl border border-black/5 bg-white p-3 shadow-lg " +
                horizontalClass
            }
        >
            <div className="text-xs font-semibold text-foreground">
                {point.fullLabel ?? point.label}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                {formatNumber(point.total)} tokens
                {typeof point.totalCalls === "number"
                    ? ` · ${formatNumber(point.totalCalls)} ${point.totalCalls === 1 ? "call" : "calls"}`
                    : null}
            </div>
            <ul className="mt-2 space-y-1">
                {point.segments.map((seg) => (
                    <li
                        key={seg.key}
                        className="flex items-center justify-between gap-2 text-[12px]"
                    >
                        <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                            <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: seg.color }}
                                aria-hidden
                            />
                            <span className="truncate">{seg.label}</span>
                        </span>
                        <span
                            className={
                                "[font-variant-numeric:tabular-nums] " +
                                (seg.value > 0
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground/60")
                            }
                        >
                            {formatNumber(seg.value)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// StackedFeatureBar renders a single horizontal bar with one colored
// segment per item, sized proportionally to item.value across the total.
// Below the bar, a 2-column legend lists each item's percent share, total,
// and call count. Empty totals collapse to a friendly "no data" state.
export type StackedFeatureBarItem = {
    key: string;
    label: string;
    value: number;       // total tokens for the segment
    prompt?: number;     // input tokens; rendered in legend if provided
    completion?: number; // output tokens; rendered in legend if provided
    calls: number;
    color: string;
};

export function StackedFeatureBar({ items }: { items: StackedFeatureBarItem[] }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const isEmpty = total === 0;

    return (
        <div>
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted">
                {!isEmpty &&
                    items.map((item) => {
                        const pct = (item.value / total) * 100;
                        if (pct <= 0) return null;
                        return (
                            <div
                                key={item.key}
                                style={{ width: `${pct}%`, backgroundColor: item.color }}
                                title={`${item.label}: ${formatNumber(item.value)} tokens (${pct.toFixed(1)}%)`}
                            />
                        );
                    })}
            </div>
            {isEmpty ? (
                <EmptyState compact message="No tokens spent in this range yet." />
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((item) => {
                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                        return (
                            <div key={item.key} className="flex items-start gap-3 text-sm">
                                <span
                                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate font-medium text-foreground">{item.label}</span>
                                        <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                                            {pct.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                                        {typeof item.prompt === "number" && typeof item.completion === "number" ? (
                                            <>
                                                {formatCompactNumber(item.prompt)} in · {formatCompactNumber(item.completion)} out · {formatNumber(item.calls)} calls
                                            </>
                                        ) : (
                                            <>
                                                {formatNumber(item.value)} tokens · {formatNumber(item.calls)} calls
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
