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
    SummaryCard,
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
            <div className="flex min-h-[40vh] items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#111827]/80 p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-[#c8925b]/20 border-t-[#d8ad7d]" />
                    <p className="mt-5 text-sm text-slate-300">Loading business health overview.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroStat
                    label="Revenue This Month"
                    value={formatCurrencyIdr(overview.total_revenue_this_month)}
                    meta="Display converted to IDR"
                    tone="revenue"
                />
                <HeroStat
                    label="Active Users"
                    value={formatNumber(overview.total_active_users)}
                    meta="Accounts ready to operate"
                    tone="neutral"
                />
                <HeroStat
                    label="Active Projects"
                    value={formatNumber(overview.total_active_projects)}
                    meta={`${formatNumber(overview.total_projects)} total tracked`}
                    tone="neutral"
                />
                <HeroStat
                    label="Tracked Payments"
                    value={formatNumber(paymentTotal)}
                    meta={watchlistTeams.length > 0 ? `${watchlistTeams.length} teams need attention` : "No urgent team alerts"}
                    tone={watchlistTeams.length > 0 ? "alert" : "calm"}
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <Panel
                    eyebrow="Overview"
                    title="Business health before configuration"
                    subtitle="This page stays focused on what is changing in the business and where you may need to intervene."
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            title="Total Active Users"
                            value={formatNumber(overview.total_active_users)}
                            meta="Live accounts with active status"
                            tone="neutral"
                        />
                        <SummaryCard
                            title="Total Active Projects"
                            value={formatNumber(overview.total_active_projects)}
                            meta="Non-deleted projects across tenants"
                            tone="cool"
                        />
                        <SummaryCard
                            title="Revenue This Month"
                            value={formatCurrencyIdr(overview.total_revenue_this_month)}
                            meta="Owner display in IDR"
                            tone="revenue"
                        />
                        <SummaryCard
                            title="Free vs Paid"
                            value={`${overview.free_vs_paid_ratio.paid} / ${overview.free_vs_paid_ratio.free}`}
                            meta="Paid teams versus free teams"
                            tone="calm"
                        />
                    </div>
                </Panel>

                <Panel
                    eyebrow="Watchlist"
                    title="Teams that may need attention"
                    subtitle="Operational risk is surfaced here so the owner dashboard stays actionable."
                >
                    <div className="space-y-3">
                        {watchlistTeams.length === 0 ? (
                            <EmptyState message="No teams are currently on the watchlist. Connection, subscription, and usage signals look stable." />
                        ) : (
                            watchlistTeams.map((team) => (
                                <div key={team.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-white">{team.name}</p>
                                            <p className="mt-1 truncate text-sm text-slate-400">
                                                {team.owner_name} - {team.current_plan_name || "No plan assigned"}
                                            </p>
                                        </div>
                                        <StatusPill
                                            tone={team.whatsapp_status === "CONNECTED" ? "calm" : "alert"}
                                            label={team.whatsapp_status === "CONNECTED" ? "Stable" : "Needs review"}
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {team.reasons.map((reason) => (
                                            <span
                                                key={`${team.id}-${reason}`}
                                                className="rounded-full border border-[#b8adff]/20 bg-[#b8adff]/10 px-3 py-1 text-xs font-medium text-[#d8d1ff]"
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

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel
                    eyebrow="Growth"
                    title="Daily registrations"
                    subtitle="A single growth view keeps the overview readable while still showing how the platform is moving."
                >
                    <DualBarChart data={overview.daily_registrations} />
                </Panel>
                <Panel
                    eyebrow="Revenue"
                    title="Monthly revenue and recurring run-rate"
                    subtitle="Keep only the financial trend that matters most on the overview page."
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
