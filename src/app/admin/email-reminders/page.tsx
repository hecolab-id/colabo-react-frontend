"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
    getAdminEmailReminderLogs,
    getAdminEmailReminderRecipients,
    getAdminEmailReminderSummary,
} from "@/lib/api";
import {
    AdminEmailReminderDailyPoint,
    AdminEmailReminderLogRow,
    AdminEmailReminderLogStatus,
    AdminEmailReminderRecipientRow,
    AdminEmailReminderRecipientState,
    AdminEmailReminderSummary,
    AdminListResponse,
} from "@/lib/types";
import {
    EmptyState,
    HeroStat,
    PaginationControls,
    Panel,
    SearchField,
    SkeletonHeroStatGrid,
    SkeletonRows,
    StatusPill,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery, AdminQueryResult } from "@/lib/hooks/use-admin-query";

// Keep prior data visible (dimmed) while a refetch is in flight.
const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

const PAGE_SIZE = 20;

const LOG_STATUS_TONE: Record<AdminEmailReminderLogStatus, "calm" | "slate" | "alert"> = {
    sent: "calm",
    skipped: "slate",
    failed: "alert",
};

const RECIPIENT_STATE_TONE: Record<AdminEmailReminderRecipientState, "calm" | "slate" | "warning"> = {
    enabled: "calm",
    disabled: "slate",
    missing: "warning",
};

const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- Page ----------

export default function AdminEmailRemindersPage() {
    const summaryQ = useAdminQuery<AdminEmailReminderSummary>(
        (signal) => getAdminEmailReminderSummary(signal),
        [],
        "Couldn't load reminder summary. Retry?",
    );

    return (
        <main className="space-y-6">
            <header className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Lifecycle email
                </p>
                <h2 className=" text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Weekly Task Reminders
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Who is subscribed, what the Monday 07:00 dispatch sent, and which accounts the schedule can never
                    reach.
                </p>
            </header>

            <CoverageCallout query={summaryQ} />
            <SummaryRow query={summaryQ} />
            <ActivityPanel query={summaryQ} />
            <RecipientsPanel />
            <LogsPanel />
        </main>
    );
}

// ---------- Coverage diagnostic ----------

function CoverageCallout({ query }: { query: AdminQueryResult<AdminEmailReminderSummary> }) {
    const missing = query.data?.missing_count ?? 0;
    if (query.isInitialLoading || missing <= 0) return null;

    return (
        <div
            className="flex items-start gap-3 rounded-[16px] border px-4 py-3.5"
            style={{
                backgroundColor: "var(--warning-bg)",
                borderColor: "var(--warning-border)",
            }}
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--warning-fg)" }} aria-hidden />
            <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--warning-fg)" }}>
                    {formatNumber(missing)} {missing === 1 ? "account has" : "accounts have"} no reminder preference
                </p>
                <p className="mt-0.5 text-sm text-foreground/80">
                    The scheduler only emails accounts that have a preference row, so these never receive the weekly
                    digest. Filter the roster below by &ldquo;Missing&rdquo; to review them; new signups now get a row
                    automatically.
                </p>
            </div>
        </div>
    );
}

// ---------- Summary ----------

function SummaryRow({ query }: { query: AdminQueryResult<AdminEmailReminderSummary> }) {
    if (query.isInitialLoading || !query.data) {
        if (query.error) return <EmptyState message={query.error} />;
        return <SkeletonHeroStatGrid count={4} />;
    }

    const s = query.data;
    return (
        <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 ${
                query.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS
            }`}
        >
            <HeroStat
                label="Active reminders"
                value={formatNumber(s.enabled_count)}
                meta={`${formatNumber(s.disabled_count)} opted out · ${formatNumber(s.total_users)} users total`}
            />
            <HeroStat
                label="Coverage gap"
                value={formatNumber(s.missing_count)}
                meta={s.missing_count > 0 ? "accounts with no preference row" : "every account is covered"}
            />
            <HeroStat
                label="Sent (7 days)"
                value={formatNumber(s.sent_7d)}
                meta={`${formatNumber(s.skipped_7d)} skipped · ${formatNumber(s.failed_7d)} failed`}
            />
            <HeroStat
                label="Sent this week"
                value={formatNumber(s.sent_this_week)}
                meta={s.last_sent_at ? `last ${formatDateTime(s.last_sent_at)}` : "no sends yet"}
            />
        </div>
    );
}

// ---------- Activity chart ----------

function ActivityPanel({ query }: { query: AdminQueryResult<AdminEmailReminderSummary> }) {
    return (
        <Panel
            eyebrow="Last 14 days"
            title="Dispatch activity"
            subtitle="Daily send attempts split by outcome. Skipped means the user had no open tasks that week."
        >
            {query.isInitialLoading ? (
                <SkeletonRows count={1} rowHeight={200} />
            ) : query.error ? (
                <EmptyState message={query.error} />
            ) : (
                <div className={query.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}>
                    <ActivityChart daily={query.data?.daily ?? []} />
                </div>
            )}
        </Panel>
    );
}

const ACTIVITY_SEGMENTS = [
    { key: "sent", label: "Sent", color: "var(--primary)" },
    { key: "skipped", label: "Skipped", color: "var(--muted-foreground)" },
    { key: "failed", label: "Failed", color: "var(--danger-fg)" },
] as const;

function ActivityChart({ daily }: { daily: AdminEmailReminderDailyPoint[] }) {
    const hasData = daily.some((d) => d.sent + d.skipped + d.failed > 0);
    if (!hasData) {
        return (
            <EmptyState
                compact
                message="No reminder activity in the last 14 days yet. Bars fill in after the weekly dispatch runs."
            />
        );
    }

    const max = Math.max(1, ...daily.map((d) => d.sent + d.skipped + d.failed));
    const lastIdx = Math.max(0, daily.length - 1);
    const totalSent = daily.reduce((sum, d) => sum + d.sent, 0);
    const totalSkipped = daily.reduce((sum, d) => sum + d.skipped, 0);
    const totalFailed = daily.reduce((sum, d) => sum + d.failed, 0);

    return (
        <div>
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {ACTIVITY_SEGMENTS.map((seg) => (
                    <span key={seg.key} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} aria-hidden />
                        {seg.label}
                    </span>
                ))}
            </div>
            <div
                role="img"
                aria-label={`Dispatch activity, last 14 days: ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed`}
                className="flex h-44 items-end gap-1 rounded-[14px] border border-black/5 bg-white px-3 pb-3 pt-5"
            >
                {daily.map((d) => {
                    const total = d.sent + d.skipped + d.failed;
                    return (
                        <div
                            key={d.date}
                            className="flex h-full min-w-0 flex-1 flex-col-reverse"
                            title={`${formatDayFull(d.date)} · ${d.sent} sent, ${d.skipped} skipped, ${d.failed} failed`}
                        >
                            <div
                                className="flex w-full flex-col-reverse overflow-hidden rounded-md"
                                style={{ height: `${(total / max) * 100}%` }}
                            >
                                {ACTIVITY_SEGMENTS.map((seg) => {
                                    const value = d[seg.key];
                                    if (value <= 0) return null;
                                    return (
                                        <div
                                            key={seg.key}
                                            style={{
                                                height: `${(value / total) * 100}%`,
                                                backgroundColor: seg.color,
                                                minHeight: 1,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex gap-1 px-3 text-[10px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                {daily.map((d, idx) => (
                    <div key={d.date} className="min-w-0 flex-1 text-center">
                        {idx === 0 || idx === lastIdx || idx === Math.floor(lastIdx / 2) ? formatDayLabel(d.date) : ""}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------- Recipients roster ----------

const RECIPIENT_FILTERS: { value: string; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Opted out" },
    { value: "missing", label: "Missing" },
];

function RecipientsPanel() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [state, setState] = useState("ALL");

    useEffect(() => {
        setPage(1);
    }, [search, state]);

    const recipientsQ = useAdminQuery<AdminListResponse<AdminEmailReminderRecipientRow>>(
        (signal) =>
            getAdminEmailReminderRecipients(
                {
                    q: search || undefined,
                    state: state === "ALL" ? undefined : state,
                    page,
                    page_size: PAGE_SIZE,
                },
                signal,
            ),
        [search, state, page],
        "Couldn't load recipients. Retry?",
    );

    const rows = recipientsQ.data?.items ?? [];
    const total = recipientsQ.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Panel
            eyebrow="Roster"
            title="Reminder recipients"
            subtitle="Every account and its weekly digest state. Missing accounts are listed first."
        >
            <div className="mb-4 space-y-3">
                <SearchField value={search} onChange={setSearch} placeholder="Search name or email" />
                <FilterPills options={RECIPIENT_FILTERS} value={state} onChange={setState} />
            </div>

            {recipientsQ.isInitialLoading ? (
                <SkeletonRows count={5} rowHeight={76} />
            ) : recipientsQ.error ? (
                <EmptyState message={recipientsQ.error} />
            ) : rows.length === 0 ? (
                <EmptyState message="No accounts match this filter." />
            ) : (
                <ul className={`space-y-2 ${recipientsQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
                    {rows.map((row) => (
                        <RecipientRow key={row.user_id} row={row} />
                    ))}
                </ul>
            )}

            {!recipientsQ.isInitialLoading && rows.length > 0 ? (
                <div className="mt-4">
                    <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        totalItems={total}
                        label={total === 1 ? "account" : "accounts"}
                        onChange={setPage}
                    />
                </div>
            ) : null}
        </Panel>
    );
}

function RecipientRow({ row }: { row: AdminEmailReminderRecipientRow }) {
    return (
        <li className="rounded-[16px] border border-black/5 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="truncate text-[15px] font-semibold text-foreground">
                            {row.user_name || "Unnamed user"}
                        </h3>
                        <StatusPill tone={RECIPIENT_STATE_TONE[row.state]} label={row.state} />
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">{row.user_email}</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground sm:justify-end [font-variant-numeric:tabular-nums]">
                    <span>
                        <span className="text-muted-foreground/70">Schedule </span>
                        {formatSchedule(row)}
                    </span>
                    <span>
                        <span className="text-muted-foreground/70">Last sent </span>
                        {formatDateTime(row.last_sent_at)}
                    </span>
                </div>
            </div>
        </li>
    );
}

// ---------- Send logs ----------

const LOG_FILTERS: { value: string; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "skipped", label: "Skipped" },
    { value: "failed", label: "Failed" },
];

function LogsPanel() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");

    useEffect(() => {
        setPage(1);
    }, [search, status]);

    const logsQ = useAdminQuery<AdminListResponse<AdminEmailReminderLogRow>>(
        (signal) =>
            getAdminEmailReminderLogs(
                {
                    q: search || undefined,
                    status: status === "ALL" ? undefined : status,
                    page,
                    page_size: PAGE_SIZE,
                },
                signal,
            ),
        [search, status, page],
        "Couldn't load logs. Retry?",
    );

    const rows = logsQ.data?.items ?? [];
    const total = logsQ.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Panel
            eyebrow="Send log"
            title="Recent dispatches"
            subtitle="One row per send attempt, newest first. Failures keep their error so you can see why."
        >
            <div className="mb-4 space-y-3">
                <SearchField value={search} onChange={setSearch} placeholder="Search recipient email or name" />
                <FilterPills options={LOG_FILTERS} value={status} onChange={setStatus} />
            </div>

            {logsQ.isInitialLoading ? (
                <SkeletonRows count={6} rowHeight={64} />
            ) : logsQ.error ? (
                <EmptyState message={logsQ.error} />
            ) : rows.length === 0 ? (
                <EmptyState message="No send attempts match this filter yet." />
            ) : (
                <ul className={`space-y-2 ${logsQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
                    {rows.map((row) => (
                        <LogRow key={row.id} row={row} />
                    ))}
                </ul>
            )}

            {!logsQ.isInitialLoading && rows.length > 0 ? (
                <div className="mt-4">
                    <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        totalItems={total}
                        label={total === 1 ? "attempt" : "attempts"}
                        onChange={setPage}
                    />
                </div>
            ) : null}
        </Panel>
    );
}

function LogRow({ row }: { row: AdminEmailReminderLogRow }) {
    return (
        <li className="rounded-[16px] border border-black/5 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StatusPill tone={LOG_STATUS_TONE[row.status]} label={row.status} />
                        <span className="truncate font-mono text-[12px] text-muted-foreground">
                            {row.recipient_email}
                        </span>
                    </div>
                    {row.error_message ? (
                        <p className="mt-1.5 break-words text-[13px] text-[color:var(--danger-fg)]">
                            {row.error_message}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground sm:justify-end [font-variant-numeric:tabular-nums]">
                    {row.status === "sent" ? (
                        <span>
                            <strong className="font-semibold text-foreground">{formatNumber(row.task_count)}</strong>{" "}
                            {row.task_count === 1 ? "task" : "tasks"}
                        </span>
                    ) : null}
                    <span>{formatDateTime(row.created_at)}</span>
                </div>
            </div>
        </li>
    );
}

// ---------- Shared filter pills ----------

function FilterPills({
    options,
    value,
    onChange,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="-mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={
                        "min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition md:min-h-0 " +
                        (value === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ---------- Formatters ----------

function formatSchedule(row: AdminEmailReminderRecipientRow): string {
    if (row.state === "missing" || row.day_of_week == null || row.hour_local == null) return "—";
    const day = WEEKDAYS[row.day_of_week] ?? "?";
    const hour = String(row.hour_local).padStart(2, "0");
    const tz = row.timezone ? ` · ${row.timezone}` : "";
    return `${day} ${hour}:00${tz}`;
}

function formatDateTime(value?: string | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function parseUtcDate(date: string): Date | null {
    const [y, m, d] = date.split("-");
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function formatDayLabel(date: string): string {
    const dt = parseUtcDate(date);
    if (!dt) return date;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatDayFull(date: string): string {
    const dt = parseUtcDate(date);
    if (!dt) return date;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
