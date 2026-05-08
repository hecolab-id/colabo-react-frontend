"use client";

import { useMemo } from "react";
import { getAdminDashboard, getAdminPayments, getAdminTeams } from "@/lib/api";
import { AdminListResponse, AdminOverview, AdminPaymentTransaction, AdminTeamRow } from "@/lib/types";
import {
    DualBarChart,
    EmptyState,
    HeroStat,
    Panel,
    Skeleton,
    SkeletonHeroStatGrid,
    StackedTrend,
    StatusPill,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

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
                    team.whatsapp_status !== "CONNECTED" ? "WhatsApp bot disconnected" : null,
                    team.subscription_status === "CANCELLED" || team.subscription_status === "EXPIRED"
                        ? `Subscription ${team.subscription_status?.toLowerCase()}`
                        : null,
                    team.monthly_ai_tokens_used >= 500000 ? "High AI token usage this month" : null,
                    team.project_count === 0 ? "No active projects yet" : null,
                ].filter(Boolean) as string[],
            }))
            .filter((team) => team.reasons.length > 0)
            .sort((left, right) => right.reasons.length - left.reasons.length)
            .slice(0, 5);
    }, [teams]);

    // The overview page renders the full layout once data is partial-ready,
    // so the skeleton matches the final structure: hero grid + 2-column
    // panel + chart panel. No more blocking spinner.
    if (overviewQ.isInitialLoading || !overview) {
        if (overviewQ.error) {
            return <EmptyState message={overviewQ.error} />;
        }
        return (
            <div className="space-y-6">
                <SkeletonHeroStatGrid count={4} />
                <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                    <Skeleton height={280} rounded="2xl" className="border border-black/5 bg-white" />
                    <Skeleton height={280} rounded="2xl" className="border border-black/5 bg-white" />
                </section>
                <Skeleton height={260} rounded="2xl" className="border border-black/5 bg-white" />
            </div>
        );
    }

    const isRefreshing =
        overviewQ.isRefreshing || teamsQ.isRefreshing || paymentsQ.isRefreshing;

    return (
        <div className={`space-y-6 ${isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <HeroStat
                    label="Revenue this month"
                    value={formatCurrencyIdr(overview.total_revenue_this_month)}
                    meta="Display converted to IDR"
                />
                <HeroStat
                    label="Active users"
                    value={formatNumber(overview.total_active_users)}
                    meta="Accounts ready to operate"
                />
                <HeroStat
                    label="Active projects"
                    value={formatNumber(overview.total_active_projects)}
                    meta={`${formatNumber(overview.total_projects)} total tracked`}
                />
                <HeroStat
                    label="Tracked payments"
                    value={formatNumber(paymentTotal)}
                    meta={watchlistTeams.length > 0 ? `${watchlistTeams.length} teams need attention` : "No urgent team alerts"}
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <Panel
                    eyebrow="Growth"
                    title="Free vs paid"
                    subtitle={`Paid: ${formatNumber(overview.free_vs_paid_ratio.paid)} · Free: ${formatNumber(overview.free_vs_paid_ratio.free)}.`}
                >
                    <DualBarChart data={overview.daily_registrations} />
                </Panel>

                <Panel
                    eyebrow="Watchlist"
                    title="Teams needing attention"
                    subtitle="Operational risk surfaced so the dashboard stays actionable."
                >
                    <div className="space-y-2.5">
                        {watchlistTeams.length === 0 ? (
                            <EmptyState message="No teams on the watchlist. Connection, subscription, and usage signals look stable." compact />
                        ) : (
                            watchlistTeams.map((team) => (
                                <div key={team.id} className="rounded-[14px] border border-black/5 bg-white p-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {team.owner_name} · {team.current_plan_name || "No plan assigned"}
                                            </p>
                                        </div>
                                        <StatusPill
                                            tone={team.whatsapp_status === "CONNECTED" ? "calm" : "alert"}
                                            label={team.whatsapp_status === "CONNECTED" ? "Stable" : "Review"}
                                        />
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {team.reasons.map((reason) => (
                                            <span
                                                key={`${team.id}-${reason}`}
                                                className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-medium text-primary"
                                            >
                                                {reason}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Panel>
            </section>

            <section>
                <Panel
                    eyebrow="Revenue"
                    title="Monthly revenue and recurring run-rate"
                    subtitle="The financial trend that matters most on the overview page."
                >
                    <StackedTrend
                        primary={overview.revenue_trend}
                        secondary={overview.mrr_trend}
                        primaryLabel="Incoming revenue"
                        secondaryLabel="MRR"
                    />
                </Panel>
            </section>
        </div>
    );
}
