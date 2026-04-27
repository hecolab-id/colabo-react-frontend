"use client";

import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from "lucide-react";
import { getTeamActivityOverview } from "@/lib/api";
import { ActivityInsightItem, TeamActivityOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TeamActivityOverviewProps {
    teamSlug: string;
    children?: React.ReactNode;
}

const toneStyles = {
    positive: {
        badge: "bg-emerald-50 text-emerald-700",
        border: "border-emerald-200",
        icon: CheckCircle2,
    },
    attention: {
        badge: "bg-amber-50 text-amber-700",
        border: "border-amber-200",
        icon: AlertCircle,
    },
    risk: {
        badge: "bg-rose-50 text-rose-700",
        border: "border-rose-200",
        icon: ShieldAlert,
    },
    neutral: {
        badge: "bg-slate-100 text-slate-600",
        border: "border-slate-200",
        icon: Sparkles,
    },
} as const;

export function TeamActivityOverviewPanel({ teamSlug, children }: TeamActivityOverviewProps) {
    const [overview, setOverview] = useState<TeamActivityOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"insights" | "activity">("insights");

    useEffect(() => {
        async function loadOverview() {
            try {
                setIsLoading(true);
                const response = await getTeamActivityOverview(teamSlug);
                setOverview(response);
            } catch (error) {
                console.error("Failed to load activity overview:", error);
                setOverview(null);
            } finally {
                setIsLoading(false);
            }
        }

        loadOverview();
    }, [teamSlug]);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="h-3 w-20 rounded-full bg-slate-200" />
                            <div className="mt-4 h-8 w-14 rounded-full bg-slate-200" />
                            <div className="mt-3 h-3 w-28 rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>

                {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="h-4 w-40 rounded-full bg-slate-200" />
                        <div className="mt-3 h-3 w-64 rounded-full bg-slate-200" />
                        <div className="mt-6 space-y-3">
                            {Array.from({ length: 2 }).map((__, itemIndex) => (
                                <div key={itemIndex} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
                                    <div className="h-4 w-44 rounded-full bg-slate-200" />
                                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200" />
                                    <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-200" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        );
    }

    if (!overview) {
        return (
            <section className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                Activity insights are not available right now. The detailed log is still available below.
            </section>
        );
    }

    const startHere = overview.start_here;

    // Deduplicate the primary Start Here task from the rest of the insight panels
    const isSameTask = (item: ActivityInsightItem) => {
        if (item.href && startHere.href) {
            return item.href === startHere.href;
        }
        return item.message === startHere.message;
    };

    const deduplicatedSections = overview.sections.map(section => ({
        ...section,
        items: section.items.filter(item => !isSameTask(item))
    }));

    const needsAttentionSection = deduplicatedSections.find((s) => s.id === "needs_attention");
    const topNeedsAttentionItems = needsAttentionSection?.items.slice(0, 3) || [];
    const remainingNeedsAttentionCount = (needsAttentionSection?.items.length || 0) - topNeedsAttentionItems.length;

    return (
        <section className="space-y-6">
            <StartHereCard overview={overview} />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMetric
                    label="Completed recently"
                    value={overview.summary.completed_recently_count}
                    context="Reached Done in the last 7 days"
                    tone="positive"
                />
                <SummaryMetric
                    label="Needs attention"
                    value={overview.summary.needs_attention_count}
                    context="Current tasks that may need support"
                    tone="attention"
                />
                <SummaryMetric
                    label="Potential risks"
                    value={overview.summary.potential_risk_count}
                    context={overview.visibility.show_project_risk ? "Project-level signals available in this view" : "No additional project-level risks in this view"}
                    tone="risk"
                />
                <SummaryMetric
                    label="Stalled work"
                    value={overview.summary.stalled_count}
                    context="No update in 3 days or more"
                    tone="neutral"
                />
            </div>

            {topNeedsAttentionItems.length > 0 && (
                <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                    <div className="mb-6">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">Needs Attention</h2>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                Highest Priority
                            </span>
                        </div>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">Top prioritized tasks that may need your support right now.</p>
                    </div>
                    <div className="space-y-3">
                        {topNeedsAttentionItems.map(item => (
                            <InsightCard key={item.id} item={item} />
                        ))}
                    </div>
                    {remainingNeedsAttentionCount > 0 && (
                        <div className="mt-8 flex justify-center border-t border-black/5 pt-6">
                            <button
                                onClick={() => setActiveTab('insights')}
                                className="inline-flex items-center gap-2 text-[14px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Review {remainingNeedsAttentionCount} more items in Insights Tab
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </section>
            )}

            <div className="mt-8 w-full border-b border-black/5">
                <div className="flex items-center gap-8 px-2 max-w-4xl">
                    <button
                        onClick={() => setActiveTab("insights")}
                        className={`flex items-center gap-2 pb-4 pt-2 text-[15px] font-semibold transition-all relative ${
                            activeTab === "insights" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Project Insights
                        {activeTab === "insights" && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("activity")}
                        className={`flex items-center gap-2 pb-4 pt-2 text-[15px] font-semibold transition-all relative ${
                            activeTab === "activity" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Detailed Log
                        {activeTab === "activity" && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            <div className="pt-2">
                {activeTab === "insights" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {deduplicatedSections.map((section) => (
                            <SectionPanel 
                                key={section.id} 
                                section={section} 
                                initiallyExpanded={section.id === "needs_attention"} 
                            />
                        ))}
                    </div>
                )}
                {activeTab === "activity" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {children}
                    </div>
                )}
            </div>
        </section>
    );
}

function SectionPanel({ section, initiallyExpanded = false }: { section: TeamActivityOverview["sections"][0], initiallyExpanded?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
    const visibleItems = isExpanded ? section.items : section.items.slice(0, 3);
    const hasMore = section.items.length > 3;

    return (
        <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
            <div className="mb-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">{section.title}</h2>
                    {section.id === "needs_attention" ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Ranked by urgency
                        </span>
                    ) : null}
                </div>
                {section.description ? (
                    <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{section.description}</p>
                ) : null}
            </div>

            <div className="space-y-3">
                {visibleItems.map((item) => (
                    <InsightCard key={item.id} item={item} />
                ))}
            </div>

            {hasMore ? (
                <div className="mt-6 flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-black/5 bg-slate-50 px-6 py-2.5 text-[13px] font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 shadow-sm hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none"
                    >
                        {isExpanded ? (
                            <>
                                Show Less
                                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            </>
                        ) : (
                            <>
                                View all {section.items.length} updates
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </>
                        )}
                    </button>
                </div>
            ) : null}
        </section>
    );
}

function StartHereCard({ overview }: { overview: TeamActivityOverview }) {
    const recommendation = overview.start_here;
    const tone = toneStyles[recommendation.tone];
    const Icon = tone.icon;
    const scopeLabel = overview.visibility.audience === "leader" ? "Team view" : "Your view";
    const frameCopy = overview.visibility.audience === "leader"
        ? "The clearest next action for keeping work moving."
        : "The clearest next action based on work you own or can directly help with.";

    const content = (
        <div className={cn(
            "rounded-[32px] border bg-white p-8 shadow-sm transition-all hover:shadow-md",
            tone.border,
        )}>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                            Start Here
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {scopeLabel}
                        </span>
                    </div>

                    <div className="mt-4 flex items-start gap-3">
                        <div className={cn("mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tone.badge)}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                                {recommendation.message}
                            </p>
                            <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
                                {frameCopy}
                            </p>
                            {recommendation.supporting_text ? (
                                <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                                    {recommendation.supporting_text}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {recommendation.href ? (
                    <div className="shrink-0">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]">
                            Open Task
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );

    if (!recommendation.href) {
        return content;
    }

    return (
        <Link href={recommendation.href} className="block rounded-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200">
            {content}
        </Link>
    );
}

function SummaryMetric({
    label,
    value,
    context,
    tone,
}: {
    label: string;
    value: number;
    context: string;
    tone: keyof typeof toneStyles;
}) {
    const Icon = toneStyles[tone].icon;

    return (
        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
            <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]", toneStyles[tone].badge)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
            </div>
            <div className="mt-5 font-space-grotesk text-[40px] font-semibold tracking-tight text-slate-900 leading-none">{value}</div>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-500">{context}</p>
        </div>
    );
}

function InsightCard({ item }: { item: ActivityInsightItem }) {
    const tone = toneStyles[item.tone];
    const Icon = tone.icon;
    const content = (
        <div className={cn("rounded-[24px] border border-black/5 bg-slate-50 p-6 shadow-sm transition-all hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.99]", tone.border)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]", tone.badge)}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.title}
                    </div>
                    <p className="mt-4 text-[16px] font-semibold tracking-tight text-slate-900">{item.message}</p>
                    {item.supporting_text ? (
                        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{item.supporting_text}</p>
                    ) : null}
                </div>

                {item.href ? (
                    <div className="shrink-0 mt-2 md:mt-0">
                        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-900 shadow-sm border border-black/5">
                            Open
                            <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );

    if (!item.href) {
        return content;
    }

    return (
        <Link href={item.href} className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200">
            {content}
        </Link>
    );
}
