"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import {
    getAdminAIUsageByFeature,
    getAdminAIUsageByTeam,
    getAdminAIUsageByUser,
    getAdminAIUsageSummary,
    getAdminTeams,
} from "@/lib/api";
import {
    AdminAIUsageFeatureRow,
    AdminAIUsageSummary,
    AdminAIUsageTeamRow,
    AdminAIUsageUserRow,
    AdminTeamRow,
} from "@/lib/types";
import {
    BarList,
    EmptyState,
    HeroStat,
    PaginationControls,
    Panel,
    SearchField,
    formatCompactNumber,
    formatDate,
    formatNumber,
} from "@/components/admin/admin-ui";
import { FEATURE_LABELS } from "./feature-labels";

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

function isAbortError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { code?: string; name?: string };
    return e.code === "ERR_CANCELED" || e.name === "CanceledError" || e.name === "AbortError";
}

// ---------- Page ----------

export default function AdminAIUsagePage() {
    const params = useSearchParams();
    const router = useRouter();

    const [range, setRange] = useState<RangeState>(() => readRangeFromUrl(params));
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
        () => params.get("team") || null,
    );

    // Summary panel
    const [summary, setSummary] = useState<AdminAIUsageSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Per-team panel
    const [teamRows, setTeamRows] = useState<AdminAIUsageTeamRow[]>([]);
    const [teamPage, setTeamPage] = useState(1);
    const [teamTotal, setTeamTotal] = useState(0);
    const [teamQuery, setTeamQuery] = useState("");
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamError, setTeamError] = useState<string | null>(null);

    // Top users panel
    const [userRows, setUserRows] = useState<AdminAIUsageUserRow[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotal, setUserTotal] = useState(0);
    const [userLoading, setUserLoading] = useState(true);
    const [userError, setUserError] = useState<string | null>(null);

    // Feature breakdown panel
    const [featureRows, setFeatureRows] = useState<AdminAIUsageFeatureRow[]>([]);
    const [featureLoading, setFeatureLoading] = useState(true);
    const [featureError, setFeatureError] = useState<string | null>(null);

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
        // replace, not push — filter changes shouldn't pollute history.
        router.replace(`/admin/ai-usage?${next.toString()}`);
        // router intentionally omitted from deps: stable identity from useMemo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, selectedTeamId]);

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

    // ---- Summary fetch ----
    useEffect(() => {
        const ac = new AbortController();
        setSummaryLoading(true);
        setSummaryError(null);
        getAdminAIUsageSummary(baseQuery, ac.signal)
            .then((s) => setSummary(s))
            .catch((err) => {
                if (isAbortError(err)) return;
                setSummaryError("Couldn't load summary. Retry?");
            })
            .finally(() => setSummaryLoading(false));
        return () => ac.abort();
    }, [baseQuery]);

    // ---- Per-team fetch ----
    useEffect(() => {
        const ac = new AbortController();
        setTeamLoading(true);
        setTeamError(null);
        getAdminAIUsageByTeam(
            { ...baseQuery, q: teamQuery || undefined, page: teamPage, page_size: PAGE_SIZE },
            ac.signal,
        )
            .then((res) => {
                setTeamRows(res.items);
                setTeamTotal(res.meta.total);
            })
            .catch((err) => {
                if (isAbortError(err)) return;
                setTeamError("Couldn't load teams. Retry?");
            })
            .finally(() => setTeamLoading(false));
        return () => ac.abort();
    }, [baseQuery, teamQuery, teamPage]);

    // ---- Top users fetch ----
    // Locked product decision: aggregate across all teams. The team_id filter
    // is intentionally NOT passed here. Don't "fix" this without revisiting
    // docs/ai-usage-report/README.md.
    useEffect(() => {
        const ac = new AbortController();
        setUserLoading(true);
        setUserError(null);
        const userQuery = { from: baseQuery.from, to: baseQuery.to, page: userPage, page_size: PAGE_SIZE };
        getAdminAIUsageByUser(userQuery, ac.signal)
            .then((res) => {
                setUserRows(res.items);
                setUserTotal(res.meta.total);
            })
            .catch((err) => {
                if (isAbortError(err)) return;
                setUserError("Couldn't load users. Retry?");
            })
            .finally(() => setUserLoading(false));
        return () => ac.abort();
    }, [baseQuery, userPage]);

    // ---- Feature breakdown fetch ----
    useEffect(() => {
        const ac = new AbortController();
        setFeatureLoading(true);
        setFeatureError(null);
        getAdminAIUsageByFeature(baseQuery, ac.signal)
            .then((rows) => setFeatureRows(rows))
            .catch((err) => {
                if (isAbortError(err)) return;
                setFeatureError("Couldn't load features. Retry?");
            })
            .finally(() => setFeatureLoading(false));
        return () => ac.abort();
    }, [baseQuery]);

    // ---- Reset paging when filters change ----
    useEffect(() => {
        setTeamPage(1);
        setUserPage(1);
    }, [baseQuery, teamQuery]);

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
            />

            <SummaryRow summary={summary} loading={summaryLoading} error={summaryError} />

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

                {teamLoading ? (
                    <SkeletonRows count={4} />
                ) : teamError ? (
                    <EmptyState message={teamError} />
                ) : teamRows.length === 0 ? (
                    <EmptyState message="No teams used AI in this range. Adjust the time window or pick a different team filter." />
                ) : (
                    <ul className="space-y-2">
                        {teamRows.map((row) => (
                            <TeamRow
                                key={row.team_id}
                                row={row}
                                maxTokens={teamRows[0]?.total_tokens || 0}
                            />
                        ))}
                    </ul>
                )}

                {!teamLoading && teamRows.length > 0 ? (
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
                {userLoading ? (
                    <SkeletonRows count={4} />
                ) : userError ? (
                    <EmptyState message={userError} />
                ) : userRows.length === 0 ? (
                    <EmptyState message="No user-attributed AI calls in this range." />
                ) : (
                    <ul className="space-y-2">
                        {userRows.map((row) => (
                            <UserRow
                                key={row.user_id}
                                row={row}
                                maxTokens={userRows[0]?.total_tokens || 0}
                            />
                        ))}
                    </ul>
                )}

                {!userLoading && userRows.length > 0 ? (
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
                subtitle="Always 4 rows; features without usage in this range show as zero."
            >
                {featureLoading ? (
                    <SkeletonRows count={4} />
                ) : featureError ? (
                    <EmptyState message={featureError} />
                ) : (
                    <BarList
                        items={featureRows.map((r) => ({
                            label: FEATURE_LABELS[r.feature].label,
                            value: r.total_tokens,
                        }))}
                    />
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
}: {
    range: RangeState;
    onRangeChange: (r: RangeState) => void;
    teamOptions: AdminTeamRow[];
    selectedTeamId: string | null;
    onTeamChange: (id: string | null) => void;
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

                <div className="flex items-center gap-2">
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

function SummaryRow({
    summary,
    loading,
    error,
}: {
    summary: AdminAIUsageSummary | null;
    loading: boolean;
    error: string | null;
}) {
    if (error) {
        return <EmptyState message={error} />;
    }
    if (loading || !summary) {
        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-24 animate-pulse rounded-[16px] border border-black/5 bg-white"
                    />
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

function SkeletonRows({ count }: { count: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-24 animate-pulse rounded-[16px] border border-black/5 bg-white"
                />
            ))}
        </div>
    );
}
