"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminDashboard, getAdminPayments, getAdminTeams } from "@/lib/api";
import { AdminOverview, AdminTeamRow } from "@/lib/types";
import {
    DualBarChart,
    EmptyState,
    HeroStat,
    Panel,
    StackedTrend,
    StatusPill,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";

export default function AdminOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [teams, setTeams] = useState<AdminTeamRow[]>([]);
    const [paymentTotal, setPaymentTotal] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [overviewData, teamRows, paymentRows] = await Promise.all([
                    getAdminDashboard(),
                    getAdminTeams({ page: 1, page_size: 100 }),
                    getAdminPayments({ page: 1, page_size: 1 }),
                ]);
                setOverview(overviewData);
                setTeams(teamRows?.items || []);
                setPaymentTotal(paymentRows?.meta?.total || 0);
            } catch (error) {
                console.error("Failed to load admin overview:", error);
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, []);

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

    if (loading || !overview) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
                    <p className="text-sm">Loading overview...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
