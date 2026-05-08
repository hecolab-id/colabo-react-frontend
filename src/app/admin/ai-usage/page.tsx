"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import {
    getAdminAIUsageByFeature,
    getAdminAIUsageByTeam,
    getAdminAIUsageByUser,
    getAdminAIUsageSummary,
    getAdminAIUsageTimeseries,
    getAdminTeams,
} from "@/lib/api";
import {
    AdminAIUsageFeatureRow,
    AdminAIUsageGranularity,
    AdminAIUsageSummary,
    AdminAIUsageTeamRow,
    AdminAIUsageTimeseries,
    AdminAIUsageUserRow,
    AdminListResponse,
    AdminTeamRow,
} from "@/lib/types";
import {
    EmptyState,
    HeroStat,
    PaginationControls,
    Panel,
    SearchField,
    Skeleton,
    SkeletonHeroStatGrid,
    SkeletonRows,
    StackedBarChart,
    StackedBarPoint,
    StackedFeatureBar,
    StackedFeatureBarItem,
    formatCompactNumber,
    formatDate,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery, AdminQueryResult } from "@/lib/hooks/use-admin-query";
import { FEATURE_LABELS, FEATURE_ORDER } from "./feature-labels";

// Tailwind class applied to data containers when a panel is refetching.
// Keeps the previous data on screen but dims it so the user sees that a
// refresh is in flight without losing context.
const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

// ---------- Range (filter state) ----------

type RangeKind = "7d" | "30d" | "90d" | "custom";

type RangeState = {
    kind: RangeKind;
    from?: string; // ISO 8601, only meaningful when kind === "custom"
    to?: string;
};

const RANGE_LABELS: Record<RangeKind, string> = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    custom: "Custom",
};

const RANGE_HUMAN: Record<RangeKind, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    custom: "Custom range",
};

const PAGE_SIZE = 20;

function rangeToQuery(r: RangeState): { from?: string; to?: string } {
    if (r.kind === "custom") {
        return { from: r.from, to: r.to };
    }
    // Compute from/to locally so the URL state is self-describing and the
    // backend doesn't have to fall back to its server-side default.
    const now = new Date();
    const from = new Date(now);
    if (r.kind === "7d") from.setDate(from.getDate() - 7);
    if (r.kind === "30d") from.setDate(from.getDate() - 30);
    if (r.kind === "90d") from.setDate(from.getDate() - 90);
    return { from: from.toISOString(), to: now.toISOString() };
}

function readRangeFromUrl(params: URLSearchParams): RangeState {
    const kind = params.get("range") as RangeKind | null;
    if (kind === "custom") {
        return {
            kind: "custom",
            from: params.get("from") || undefined,
            to: params.get("to") || undefined,
        };
    }
    if (kind === "7d" || kind === "30d" || kind === "90d") {
        return { kind };
    }
    return { kind: "30d" };
}

// ---------- Page ----------

export default function AdminAIUsagePage() {
    const params = useSearchParams();
    const router = useRouter();

    const [range, setRange] = useState<RangeState>(() => readRangeFromUrl(params));
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
        () => params.get("team") || null,
    );

    // Granularity override is opt-in via the FilterBar dropdown (also
    // settable via ?granularity=hour|day in the URL). When undefined, the
    // backend auto-deduces from the range duration.
    const [granularityOverride, setGranularityOverride] = useState<
        AdminAIUsageGranularity | undefined
    >(() => {
        const g = params.get("granularity");
        return g === "hour" || g === "day" ? g : undefined;
    });

    // Pagination + search are local UI state. Data fetching itself is
    // delegated to useAdminQuery below, which owns the loading / error
    // / data lifecycle and emits the two-phase loading flags.
    const [teamPage, setTeamPage] = useState(1);
    const [teamQuery, setTeamQuery] = useState("");
    const [userPage, setUserPage] = useState(1);

    // Team selector dropdown options (one-shot fetch on mount)
    const [teamOptions, setTeamOptions] = useState<AdminTeamRow[]>([]);

    // ---- URL sync ----
    useEffect(() => {
        const next = new URLSearchParams();
        next.set("range", range.kind);
        if (range.kind === "custom") {
            if (range.from) next.set("from", range.from);
            if (range.to) next.set("to", range.to);
        }
        if (selectedTeamId) next.set("team", selectedTeamId);
        if (granularityOverride) next.set("granularity", granularityOverride);
        // replace, not push — filter changes shouldn't pollute history.
        router.replace(`/admin/ai-usage?${next.toString()}`);
        // router intentionally omitted from deps: stable identity from useMemo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, selectedTeamId, granularityOverride]);

    // ---- Team options (one-shot) ----
    useEffect(() => {
        getAdminTeams({ page: 1, page_size: 100 })
            .then((res) => setTeamOptions(res.items))
            .catch(() => {
                /* non-blocking; dropdown stays empty */
            });
    }, []);

    // ---- Common query for the filter ----
    const baseQuery = useMemo(() => {
        const r = rangeToQuery(range);
        return {
            from: r.from,
            to: r.to,
            team_id: selectedTeamId ?? undefined,
        };
    }, [range, selectedTeamId]);

    // baseQuery + the granularity override (only the timeseries cares).
    const timeseriesQuery = useMemo(
        () => ({ ...baseQuery, granularity: granularityOverride }),
        [baseQuery, granularityOverride],
    );

    // ---- Five panel queries ----
    // Each panel owns its own AbortController + two-phase loading flags via
    // useAdminQuery. The hook cancels stale fetches automatically when deps
    // change, so rapid filter clicks no longer race.

    const summaryQ = useAdminQuery<AdminAIUsageSummary>(
        (signal) => getAdminAIUsageSummary(baseQuery, signal),
        [baseQuery],
        "Couldn't load summary. Retry?",
    );

    const timeseriesQ = useAdminQuery<AdminAIUsageTimeseries>(
        (signal) => getAdminAIUsageTimeseries(timeseriesQuery, signal),
        [timeseriesQuery],
        "Couldn't load daily usage. Retry?",
    );

    const teamsQ = useAdminQuery<AdminListResponse<AdminAIUsageTeamRow>>(
        (signal) =>
            getAdminAIUsageByTeam(
                {
                    ...baseQuery,
                    q: teamQuery || undefined,
                    page: teamPage,
                    page_size: PAGE_SIZE,
                },
                signal,
            ),
        [baseQuery, teamQuery, teamPage],
        "Couldn't load teams. Retry?",
    );

    // Locked product decision: aggregate across all teams. The team_id
    // filter is intentionally NOT forwarded here. Don't "fix" this without
    // revisiting docs/ai-usage-report/README.md.
    const usersQ = useAdminQuery<AdminListResponse<AdminAIUsageUserRow>>(
        (signal) =>
            getAdminAIUsageByUser(
                {
                    from: baseQuery.from,
                    to: baseQuery.to,
                    page: userPage,
                    page_size: PAGE_SIZE,
                },
                signal,
            ),
        [baseQuery, userPage],
        "Couldn't load users. Retry?",
    );

    const featuresQ = useAdminQuery<AdminAIUsageFeatureRow[]>(
        (signal) => getAdminAIUsageByFeature(baseQuery, signal),
        [baseQuery],
        "Couldn't load features. Retry?",
    );

    // ---- Reset paging when filters change ----
    useEffect(() => {
        setTeamPage(1);
        setUserPage(1);
    }, [baseQuery, teamQuery]);

    // Convenience destructuring so the JSX below stays readable.
    const teamRows = teamsQ.data?.items ?? [];
    const teamTotal = teamsQ.data?.meta.total ?? 0;
    const userRows = usersQ.data?.items ?? [];
    const userTotal = usersQ.data?.meta.total ?? 0;
    const featureRows = featuresQ.data ?? [];

    const teamTotalPages = Math.max(1, Math.ceil(teamTotal / PAGE_SIZE));
    const userTotalPages = Math.max(1, Math.ceil(userTotal / PAGE_SIZE));

    const subtitle = useMemo(() => {
        const range_label = RANGE_HUMAN[range.kind];
        const team_label = selectedTeamId
            ? teamOptions.find((t) => t.id === selectedTeamId)?.name ?? "selected team"
            : "all teams";
        return `${range_label} · ${team_label}`;
    }, [range.kind, selectedTeamId, teamOptions]);

    return (
        <main className="space-y-6">
            <header className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    AI Operations
                </p>
                <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    AI Token Usage
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {subtitle}. Aggregated from per-call telemetry.
                </p>
            </header>

            <FilterBar
                range={range}
                onRangeChange={setRange}
                teamOptions={teamOptions}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                granularityOverride={granularityOverride}
                onGranularityChange={setGranularityOverride}
            />

            <SummaryRow query={summaryQ} />

            <DailyUsagePanel
                query={timeseriesQ}
                overridden={granularityOverride !== undefined}
            />

            <Panel
                eyebrow="Per-team"
                title="Teams ranked by token usage"
                subtitle="Sortable list filtered by the active range. Use search to find a specific tenant."
            >
                <div className="mb-4">
                    <SearchField
                        value={teamQuery}
                        onChange={(v) => {
                            setTeamQuery(v);
                            setTeamPage(1);
                        }}
                        placeholder="Search team name or slug"
                    />
                </div>

                {teamsQ.isInitialLoading ? (
                    <SkeletonRows count={4} rowHeight={120} />
                ) : teamsQ.error ? (
                    <EmptyState message={teamsQ.error} />
                ) : teamRows.length === 0 ? (
                    <EmptyState message="No teams used AI in this range. Adjust the time window or pick a different team filter." />
                ) : (
                    <ul className={`space-y-2 ${teamsQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
                        {teamRows.map((row) => (
                            <TeamRow
                                key={row.team_id}
                                row={row}
                                maxTokens={teamRows[0]?.total_tokens || 0}
                            />
                        ))}
                    </ul>
                )}

                {!teamsQ.isInitialLoading && teamRows.length > 0 ? (
                    <div className="mt-4">
                        <PaginationControls
                            page={teamPage}
                            totalPages={teamTotalPages}
                            totalItems={teamTotal}
                            label={teamTotal === 1 ? "team" : "teams"}
                            onChange={setTeamPage}
                        />
                    </div>
                ) : null}
            </Panel>

            <Panel
                eyebrow="Top users"
                title="Users ranked by token usage"
                subtitle="Aggregated across every team the user belongs to. Per-team drill-down deferred to V2."
            >
                {usersQ.isInitialLoading ? (
                    <SkeletonRows count={4} rowHeight={120} />
                ) : usersQ.error ? (
                    <EmptyState message={usersQ.error} />
                ) : userRows.length === 0 ? (
                    <EmptyState message="No user-attributed AI calls in this range." />
                ) : (
                    <ul className={`space-y-2 ${usersQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
                        {userRows.map((row) => (
                            <UserRow
                                key={row.user_id}
                                row={row}
                                maxTokens={userRows[0]?.total_tokens || 0}
                            />
                        ))}
                    </ul>
                )}

                {!usersQ.isInitialLoading && userRows.length > 0 ? (
                    <div className="mt-4">
                        <PaginationControls
                            page={userPage}
                            totalPages={userTotalPages}
                            totalItems={userTotal}
                            label={userTotal === 1 ? "user" : "users"}
                            onChange={setUserPage}
                        />
                    </div>
                ) : null}
            </Panel>

            <Panel
                eyebrow="Feature breakdown"
                title="Tokens by AI feature"
                subtitle="One stacked bar showing each feature's share of the total."
            >
                {featuresQ.isInitialLoading ? (
                    <SkeletonRows count={1} rowHeight={64} />
                ) : featuresQ.error ? (
                    <EmptyState message={featuresQ.error} />
                ) : (
                    <div className={featuresQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}>
                        <StackedFeatureBar items={buildFeatureBarItems(featureRows)} />
                    </div>
                )}
            </Panel>
        </main>
    );
}

// ---------- Sub-components ----------

function FilterBar({
    range,
    onRangeChange,
    teamOptions,
    selectedTeamId,
    onTeamChange,
    granularityOverride,
    onGranularityChange,
}: {
    range: RangeState;
    onRangeChange: (r: RangeState) => void;
    teamOptions: AdminTeamRow[];
    selectedTeamId: string | null;
    onTeamChange: (id: string | null) => void;
    granularityOverride: AdminAIUsageGranularity | undefined;
    onGranularityChange: (g: AdminAIUsageGranularity | undefined) => void;
}) {
    return (
        <div className="rounded-[16px] border border-black/5 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                    {(["7d", "30d", "90d", "custom"] as RangeKind[]).map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() =>
                                onRangeChange(
                                    k === "custom"
                                        ? { kind: "custom", from: range.from, to: range.to }
                                        : { kind: k },
                                )
                            }
                            className={
                                "h-9 rounded-full px-3.5 text-sm font-medium transition " +
                                (range.kind === k
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                            }
                        >
                            {RANGE_LABELS[k]}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={granularityOverride ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            onGranularityChange(v === "hour" || v === "day" ? v : undefined);
                        }}
                        aria-label="Bucket granularity"
                        className="h-9 rounded-full border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">Auto bucket</option>
                        <option value="hour">Hourly</option>
                        <option value="day">Daily</option>
                    </select>
                    <select
                        value={selectedTeamId ?? ""}
                        onChange={(e) => onTeamChange(e.target.value || null)}
                        aria-label="Filter by team"
                        className="h-9 rounded-full border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">All teams</option>
                        {teamOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {range.kind === "custom" ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2">
                        <span className="text-muted-foreground">From</span>
                        <input
                            type="date"
                            value={range.from?.slice(0, 10) ?? ""}
                            onChange={(e) =>
                                onRangeChange({
                                    ...range,
                                    from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                                })
                            }
                            className="h-9 rounded-full border border-border bg-white px-3 text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        <span className="text-muted-foreground">To</span>
                        <input
                            type="date"
                            value={range.to?.slice(0, 10) ?? ""}
                            onChange={(e) =>
                                onRangeChange({
                                    ...range,
                                    to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
                                })
                            }
                            className="h-9 rounded-full border border-border bg-white px-3 text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                </div>
            ) : null}
        </div>
    );
}

function SummaryRow({ query }: { query: AdminQueryResult<AdminAIUsageSummary> }) {
    if (query.isInitialLoading || !query.data) {
        if (query.error) {
            return <EmptyState message={query.error} />;
        }
        return <SkeletonHeroStatGrid count={4} />;
    }

    const summary = query.data;
    return (
        <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 ${
                query.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS
            }`}
        >
            <HeroStat
                label="Total tokens"
                value={formatCompactNumber(summary.total_tokens)}
                meta={`${formatNumber(summary.total_calls)} ${summary.total_calls === 1 ? "call" : "calls"}`}
            />
            <HeroStat
                label="Active teams"
                value={formatNumber(summary.unique_teams)}
                meta={`${formatNumber(summary.unique_users)} ${summary.unique_users === 1 ? "user" : "users"}`}
            />
            <HeroStat
                label="Top team"
                value={summary.top_team || "—"}
                meta={summary.top_team_id ? "Most tokens consumed" : "No data yet"}
            />
            <HeroStat
                label="Top feature"
                value={summary.top_feature ? FEATURE_LABELS[summary.top_feature].label : "—"}
                meta={
                    summary.top_feature
                        ? FEATURE_LABELS[summary.top_feature].description
                        : "No data yet"
                }
            />
        </div>
    );
}

function TeamRow({ row, maxTokens }: { row: AdminAIUsageTeamRow; maxTokens: number }) {
    const pct = maxTokens > 0 ? (row.total_tokens / maxTokens) * 100 : 0;
    return (
        <li className="rounded-[16px] border border-black/5 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="truncate text-base font-semibold text-foreground">
                            {row.team_name}
                        </h3>
                        <span className="font-mono text-[12px] text-muted-foreground">
                            {row.team_slug}
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatCompactNumber(row.total_tokens)}
                            </strong>{" "}
                            tokens
                        </span>
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatNumber(row.call_count)}
                            </strong>{" "}
                            {row.call_count === 1 ? "call" : "calls"}
                        </span>
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatCompactNumber(row.prompt_tokens)}
                            </strong>{" "}
                            in
                        </span>
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatCompactNumber(row.completion_tokens)}
                            </strong>{" "}
                            out
                        </span>
                        {row.last_used_at ? <span>last {formatDate(row.last_used_at)}</span> : null}
                    </div>
                </div>
                <div className="w-full max-w-[160px]">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </div>
        </li>
    );
}

function UserRow({ row, maxTokens }: { row: AdminAIUsageUserRow; maxTokens: number }) {
    const pct = maxTokens > 0 ? (row.total_tokens / maxTokens) * 100 : 0;
    return (
        <li className="rounded-[16px] border border-black/5 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-foreground">
                        {row.user_name}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                        {row.user_email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatCompactNumber(row.total_tokens)}
                            </strong>{" "}
                            tokens
                        </span>
                        <span>
                            <strong className="font-semibold text-foreground">
                                {formatNumber(row.call_count)}
                            </strong>{" "}
                            {row.call_count === 1 ? "call" : "calls"}
                        </span>
                        {row.last_used_at ? <span>last {formatDate(row.last_used_at)}</span> : null}
                    </div>
                </div>
                <div className="w-full max-w-[160px]">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            </div>
        </li>
    );
}

function DailyUsagePanel({
    query,
    overridden,
}: {
    query: AdminQueryResult<AdminAIUsageTimeseries>;
    overridden: boolean;
}) {
    const timeseries = query.data;
    const granularity = timeseries?.granularity ?? "day";
    const bucketWord = granularity === "hour" ? "hourly" : "daily";
    const subtitle = overridden
        ? `Stacked by feature · ${bucketWord} buckets (manual override)`
        : `Stacked by feature · ${bucketWord} buckets (auto from range)`;

    const hasPoints = !!timeseries && timeseries.points.length > 0;

    return (
        <Panel
            eyebrow="Daily usage"
            title="Tokens over time"
            subtitle={subtitle}
        >
            {query.isInitialLoading ? (
                <Skeleton height={240} rounded="lg" className="border border-black/5 bg-white" />
            ) : query.error ? (
                <EmptyState message={query.error} />
            ) : !hasPoints ? (
                <EmptyState
                    compact
                    message="No token activity in this range yet. The chart fills in as users hit AI features."
                />
            ) : (
                <div className={query.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}>
                    <StackedBarChart points={mapTimeseriesToStackedPoints(timeseries!)} />
                </div>
            )}
            {hasPoints ? (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {FEATURE_ORDER.map((f) => (
                        <span key={f} className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: FEATURE_LABELS[f].color }}
                                aria-hidden
                            />
                            {FEATURE_LABELS[f].label}
                        </span>
                    ))}
                </div>
            ) : null}
        </Panel>
    );
}

// ---------- Helpers (chart data shaping) ----------

function mapTimeseriesToStackedPoints(ts: AdminAIUsageTimeseries): StackedBarPoint[] {
    return ts.points.map((p) => ({
        bucket: p.bucket,
        total: p.total_tokens,
        totalCalls: p.total_calls,
        label: formatBucketLabel(p.bucket, ts.granularity),
        fullLabel: formatBucketFullLabel(p.bucket, ts.granularity),
        // FEATURE_ORDER fixes vertical stack order so the same color always
        // sits at the same position regardless of which feature dominates.
        segments: FEATURE_ORDER.map((f) => ({
            key: f,
            label: FEATURE_LABELS[f].label,
            value: p.by_feature[f] ?? 0,
            color: FEATURE_LABELS[f].color,
        })),
    }));
}

function buildFeatureBarItems(rows: AdminAIUsageFeatureRow[]): StackedFeatureBarItem[] {
    return FEATURE_ORDER.map((f) => {
        const row = rows.find((r) => r.feature === f);
        return {
            key: f,
            label: FEATURE_LABELS[f].label,
            value: row?.total_tokens ?? 0,
            calls: row?.call_count ?? 0,
            color: FEATURE_LABELS[f].color,
        };
    });
}

// formatBucketLabel formats the wire-format bucket key for the chart's X-axis.
// The bucket key is locale-stable Asia/Jakarta wall-clock, so we parse it
// manually (Date.UTC + timeZone:"UTC") to keep formatting stable across
// browsers regardless of viewer locale.
function formatBucketLabel(bucket: string, granularity: AdminAIUsageGranularity): string {
    if (granularity === "hour") {
        const hour = bucket.split("T")[1] ?? "00";
        return `${hour}:00`;
    }
    const [y, m, d] = bucket.split("-");
    if (!y || !m || !d) return bucket;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

function formatBucketFullLabel(bucket: string, granularity: AdminAIUsageGranularity): string {
    if (granularity === "hour") {
        const [datePart, hourPart] = bucket.split("T");
        const [y, m, d] = (datePart ?? "").split("-");
        if (!y || !m || !d) return bucket;
        const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
        const dateLabel = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        });
        return `${dateLabel} · ${hourPart ?? "00"}:00`;
    }
    const [y, m, d] = bucket.split("-");
    if (!y || !m || !d) return bucket;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}
