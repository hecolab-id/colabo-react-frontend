"use client";

import { useEffect, useState } from "react";
import { getAdminDashboard } from "@/lib/api";
import { AdminOverview } from "@/lib/types";
import {
    DonutSplit,
    Panel,
    QuotaChart,
    StackedTrend,
    SummaryCard,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";

export default function AdminRevenuePage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<AdminOverview | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setOverview(await getAdminDashboard());
            } catch (error) {
                console.error("Failed to load admin revenue:", error);
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, []);

    if (loading || !overview) {
        return <div className="rounded-[28px] border border-white/10 bg-[#111827]/60 p-8 text-sm text-slate-300">Loading revenue analytics.</div>;
    }

    return (
        <div className="space-y-4">
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
