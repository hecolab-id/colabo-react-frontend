"use client";

import { getAdminDashboard } from "@/lib/api";
import { AdminOverview } from "@/lib/types";
import {
    DonutSplit,
    EmptyState,
    Panel,
    QuotaChart,
    Skeleton,
    SkeletonHeroStatGrid,
    StackedTrend,
    SummaryCard,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

export default function AdminRevenuePage() {
    const overviewQ = useAdminQuery<AdminOverview>(
        (signal) => getAdminDashboard(signal),
        [],
        "Couldn't load revenue analytics. Retry?",
    );

    if (overviewQ.isInitialLoading) {
        return (
            <div className="space-y-4">
                <SkeletonHeroStatGrid count={4} />
                <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <Skeleton height={280} rounded="2xl" className="border border-black/5 bg-white" />
                    <Skeleton height={280} rounded="2xl" className="border border-black/5 bg-white" />
                </section>
                <Skeleton height={240} rounded="2xl" className="border border-black/5 bg-white" />
            </div>
        );
    }

    if (overviewQ.error || !overviewQ.data) {
        return <EmptyState message={overviewQ.error ?? "Couldn't load revenue analytics."} />;
    }

    const overview = overviewQ.data;

    return (
        <div className={`space-y-4 ${overviewQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard title="Revenue This Month" value={formatCurrencyIdr(overview.total_revenue_this_month)} meta="Converted display in IDR" tone="revenue" />
                <SummaryCard title="Paid Teams" value={formatNumber(overview.free_vs_paid_ratio.paid)} meta="Current paid tenant count" tone="calm" />
                <SummaryCard title="Free Teams" value={formatNumber(overview.free_vs_paid_ratio.free)} meta="Still on free tier" tone="neutral" />
                <SummaryCard title="Tracked Projects" value={formatNumber(overview.total_projects)} meta="Business activity context" tone="cool" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <Panel
                    eyebrow="Revenue"
                    title="Monthly revenue and recurring run-rate"
                    subtitle="A dedicated revenue page keeps financial performance separate from daily operations and support work."
                >
                    <StackedTrend
                        primary={overview.revenue_trend}
                        secondary={overview.mrr_trend}
                        primaryLabel="Incoming revenue"
                        secondaryLabel="MRR"
                    />
                </Panel>

                <Panel
                    eyebrow="Mix"
                    title="Free to paid ratio"
                    subtitle="A cleaner revenue story starts with understanding plan distribution across the tenant base."
                >
                    <DonutSplit free={overview.free_vs_paid_ratio.free} paid={overview.free_vs_paid_ratio.paid} />
                </Panel>
            </section>

            <section>
                <Panel
                    eyebrow="Capacity"
                    title="Quota consumption trend"
                    subtitle="Keep one supporting usage chart here so the revenue page stays readable."
                >
                    <QuotaChart data={overview.quota_usage_trend} />
                </Panel>
            </section>
        </div>
    );
}
