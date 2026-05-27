"use client";

import { useMemo } from "react";
import { getAdminDashboard, getAdminPayments, getAdminTeams } from "@/lib/api";
import { AdminListResponse, AdminOverview, AdminPaymentTransaction, AdminTeamRow, AdminTrendPoint } from "@/lib/types";
import {
    DualBarChart,
    EmptyState,
    Panel,
    Skeleton,
    StackedTrend,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

type StatusTone = "ok" | "warning" | "alert" | "neutral";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

function formatPercentDelta(latest: number, prev: number): string {
    if (prev <= 0 && latest <= 0) return "tetap";
    if (prev <= 0) return "baru";
    const delta = ((latest - prev) / prev) * 100;
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(0)}% vs bulan lalu`;
}

function tail<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

function prevOfTail<T>(arr: T[]): T | undefined {
    return arr.length > 1 ? arr[arr.length - 2] : undefined;
}

export default function AdminOverviewPage() {
    const overviewQ = useAdminQuery<AdminOverview>(
        (signal) => getAdminDashboard(signal),
        [],
        "Couldn't load overview. Retry?",
    );
    const teamsQ = useAdminQuery<AdminListResponse<AdminTeamRow>>(
        (signal) => getAdminTeams({ page: 1, page_size: 100 }, signal),
        [],
    );
    const paymentsQ = useAdminQuery<AdminListResponse<AdminPaymentTransaction>>(
        (signal) => getAdminPayments({ page: 1, page_size: 1 }, signal),
        [],
    );

    const overview = overviewQ.data;
    const teams = teamsQ.data?.items ?? [];
    const paymentTotal = paymentsQ.data?.meta.total ?? 0;

    const watchlistTeams = useMemo(() => {
        return [...teams]
            .map((team) => ({
                ...team,
                reasons: [
                    team.whatsapp_status !== "CONNECTED" ? "WhatsApp bot terputus" : null,
                    team.subscription_status === "CANCELLED" || team.subscription_status === "EXPIRED"
                        ? `Subscription ${team.subscription_status?.toLowerCase()}`
                        : null,
                    team.monthly_ai_tokens_used >= 500000 ? "Penggunaan AI token tinggi bulan ini" : null,
                    team.project_count === 0 ? "Belum ada project aktif" : null,
                ].filter(Boolean) as string[],
            }))
            .filter((team) => team.reasons.length > 0)
            .sort((left, right) => right.reasons.length - left.reasons.length);
    }, [teams]);

    const visibleWatchlist = watchlistTeams.slice(0, 5);
    const overflowWatchlist = Math.max(watchlistTeams.length - visibleWatchlist.length, 0);

    const today = useMemo(() => dateFormatter.format(new Date()), []);

    const isInitialLoading = overviewQ.isInitialLoading || !overview;

    if (isInitialLoading) {
        if (overviewQ.error) {
            return (
                <div className="space-y-8">
                    <StatusHeader date={today} tone="alert" message="Gagal memuat data. Refresh halaman." />
                    <EmptyState message={overviewQ.error} />
                </div>
            );
        }
        return (
            <div className="space-y-8">
                <StatusHeader date={today} tone="neutral" message="Memuat data" loading />
                <section>
                    <Skeleton height={280} rounded="2xl" className="border border-black/5 bg-white" />
                </section>
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr]">
                    <Skeleton height={220} rounded="2xl" className="border border-black/5 bg-white" />
                    <Skeleton height={220} rounded="2xl" className="border border-black/5 bg-white" />
                    <Skeleton height={220} rounded="2xl" className="border border-black/5 bg-white" />
                </section>
            </div>
        );
    }

    const isRefreshing =
        overviewQ.isRefreshing || teamsQ.isRefreshing || paymentsQ.isRefreshing;

    const watchlistCount = watchlistTeams.length;
    const statusTone: StatusTone = watchlistCount === 0 ? "ok" : watchlistCount >= 3 ? "alert" : "warning";
    const statusMessage =
        watchlistCount === 0
            ? "Semua team sehat"
            : `${watchlistCount} team butuh perhatian`;

    const revenueLatest = tail<AdminTrendPoint>(overview.revenue_trend);
    const revenuePrev = prevOfTail<AdminTrendPoint>(overview.revenue_trend);
    const mrrLatest = tail<AdminTrendPoint>(overview.mrr_trend);

    const heroSummaryParts: string[] = [];
    if (revenueLatest) {
        heroSummaryParts.push(`${formatCurrencyIdr(revenueLatest.value)} bulan ini`);
    }
    if (mrrLatest) {
        heroSummaryParts.push(`${formatCurrencyIdr(mrrLatest.value)} MRR`);
    }
    if (revenueLatest && revenuePrev) {
        heroSummaryParts.push(formatPercentDelta(revenueLatest.value, revenuePrev.value));
    }
    const heroSummary = heroSummaryParts.join("  ·  ");

    const paidCount = overview.free_vs_paid_ratio.paid;
    const freeCount = overview.free_vs_paid_ratio.free;

    return (
        <div className={`space-y-8 ${isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
            <StatusHeader date={today} tone={statusTone} message={statusMessage} />

            <section>
                <Panel
                    eyebrow="Revenue & MRR"
                    title="Tren bulanan"
                    subtitle={heroSummary || "Belum ada data revenue bulan ini."}
                >
                    {overview.revenue_trend.length > 0 ? (
                        <StackedTrend
                            primary={overview.revenue_trend}
                            secondary={overview.mrr_trend}
                            primaryLabel="Incoming revenue"
                            secondaryLabel="MRR"
                        />
                    ) : (
                        <EmptyState message="Belum ada transaksi yang tercatat bulan ini." compact />
                    )}
                </Panel>
            </section>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr]">
                <Panel eyebrow="Watchlist" title="Butuh perhatian">
                    {visibleWatchlist.length === 0 ? (
                        <EmptyState
                            message="Tidak ada team yang butuh perhatian. Status sinyal stabil."
                            compact
                        />
                    ) : (
                        <ul className="-mx-2 space-y-0.5">
                            {visibleWatchlist.map((team) => (
                                <li key={team.id}>
                                    <button
                                        type="button"
                                        className="group flex w-full items-start gap-3 rounded-[12px] px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                                team.reasons.length >= 2 ? "bg-rose-500" : "bg-amber-500"
                                            }`}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-foreground">
                                                {team.name}
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                {team.reasons.join(" · ")}
                                            </span>
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className="mt-1 text-slate-300 transition-colors group-hover:text-slate-500"
                                        >
                                            ›
                                        </span>
                                    </button>
                                </li>
                            ))}
                            {overflowWatchlist > 0 ? (
                                <li className="px-2 pt-2 text-xs text-muted-foreground">
                                    + {overflowWatchlist} team lainnya
                                </li>
                            ) : null}
                        </ul>
                    )}
                </Panel>

                <Panel eyebrow="Akuisisi" title="Free vs paid">
                    {overview.daily_registrations.length > 0 ? (
                        <>
                            <DualBarChart data={overview.daily_registrations} />
                            <p className="mt-4 text-xs text-muted-foreground">
                                {formatNumber(paidCount)} berbayar · {formatNumber(freeCount)} gratis
                            </p>
                        </>
                    ) : (
                        <EmptyState message="Belum ada registrasi tercatat." compact />
                    )}
                </Panel>

                <aside aria-label="Angka singkat" className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Angka singkat
                    </p>
                    <dl className="mt-5 space-y-4">
                        <QuickStat
                            value={formatNumber(overview.total_active_users)}
                            label="user aktif"
                            hint={`${formatNumber(overview.total_active_projects)} project hidup`}
                        />
                        <QuickStat
                            value={formatNumber(paymentTotal)}
                            label="payment terlacak"
                            hint={
                                watchlistCount > 0
                                    ? `${watchlistCount} team perlu di-review`
                                    : "Operasional stabil"
                            }
                        />
                    </dl>
                </aside>
            </section>
        </div>
    );
}

function StatusHeader({
    date,
    tone,
    message,
    loading = false,
}: {
    date: string;
    tone: StatusTone;
    message: string;
    loading?: boolean;
}) {
    const dotClass =
        tone === "ok"
            ? "bg-emerald-500"
            : tone === "warning"
              ? "bg-amber-500"
              : tone === "alert"
                ? "bg-rose-500"
                : "bg-slate-300";

    return (
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-black/5 pb-4">
            <h1 className="text-base font-semibold tracking-tight text-foreground">Overview</h1>
            <span aria-hidden="true" className="text-sm text-slate-300">·</span>
            <time className="text-sm text-muted-foreground" dateTime={new Date().toISOString()}>
                {date}
            </time>
            <span aria-hidden="true" className="text-sm text-slate-300">·</span>
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${dotClass} ${loading ? "motion-safe:animate-pulse" : ""}`}
                />
                {message}
            </p>
        </header>
    );
}

function QuickStat({ value, label, hint }: { value: string; label: string; hint?: string }) {
    return (
        <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
                {value}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p> : null}
        </div>
    );
}
