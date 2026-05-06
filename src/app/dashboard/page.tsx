"use client";

import { useCallback, useEffect, useState } from "react";
import { createProject, getDashboardOverview } from "@/lib/api";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FolderKanban,
    Plus,
    Sparkles,
    Target,
    Users,
} from "lucide-react";
import Link from "@/components/app-link";
import { useRouter } from "@/lib/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MobilePremiumPrompt } from "@/components/layout/mobile-premium-prompt";
import { DashboardActionBucketId, DashboardActionItem, DashboardActionSeverity, DashboardOverview } from "@/lib/types";
import { useStore } from "@/lib/store";

const numberFormatter = new Intl.NumberFormat();
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
});

const bucketMeta: Record<DashboardActionBucketId, { label: string; summary: string; icon: typeof AlertTriangle }> = {
    needs_attention: {
        label: "Needs Attention",
        summary: "Past due or slipping",
        icon: AlertTriangle,
    },
    due_soon: {
        label: "Due Soon",
        summary: "Landing in coming days",
        icon: Clock3,
    },
    blocked: {
        label: "Blocked / Stalled",
        summary: "Needs intervention",
        icon: Target,
    },
    ready_to_resume: {
        label: "Ready to Resume",
        summary: "Safe re-entry points",
        icon: Sparkles,
    },
};

function getSeverityClasses(severity: DashboardActionSeverity) {
    if (severity === "critical") {
        return {
            card: "border-rose-100/50 bg-rose-50/30",
            badge: "bg-rose-100/50 text-rose-700",
            accent: "text-rose-600",
            iconBg: "bg-rose-100/50 text-rose-600",
        };
    }

    if (severity === "warning") {
        return {
            card: "border-amber-100/50 bg-amber-50/30",
            badge: "bg-amber-100/50 text-amber-700",
            accent: "text-amber-700",
            iconBg: "bg-amber-100/50 text-amber-600",
        };
    }

    if (severity === "stable") {
        return {
            card: "border-emerald-100/50 bg-emerald-50/30",
            badge: "bg-emerald-100/50 text-emerald-700",
            accent: "text-emerald-700",
            iconBg: "bg-emerald-100/50 text-emerald-600",
        };
    }

    return {
        card: "border-black/5 bg-white",
        badge: "bg-slate-100 text-slate-700",
        accent: "text-slate-700",
        iconBg: "bg-slate-100 text-slate-600",
    };
}

function getMetricToneClasses(tone: DashboardActionSeverity) {
    if (tone === "critical") return "text-rose-600";
    if (tone === "warning") return "text-amber-600";
    if (tone === "stable") return "text-emerald-600";
    return "text-slate-900";
}

function formatDueDate(value?: string | null) {
    if (!value) return "No due date";
    return dateFormatter.format(new Date(value));
}

function DashboardActionLink({ item }: { item: DashboardActionItem }) {
    const styles = getSeverityClasses(item.severity);

    return (
        <Link
            href={item.href}
            className={`group block rounded-[20px] border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${styles.card} p-5`}
        >
            <div className="flex items-start gap-4">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 flex-1 truncate text-base font-medium text-slate-900">
                            {item.title}
                        </h4>
                        {item.statusLabel && (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles.badge}`}>
                                {item.statusLabel}
                            </span>
                        )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{item.reason}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
                        {item.projectCode && (
                            <span className="font-mono text-slate-400">
                                {item.projectCode}
                            </span>
                        )}
                        {item.projectCode && <span className="h-1 w-1 rounded-full bg-slate-300" />}
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            {formatDueDate(item.dueAt)}
                        </span>
                    </div>
                </div>

                <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 opacity-0 transition-all group-hover:opacity-100">
                    <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
}

function DashboardPriorityActionLink({ item, label }: { item: DashboardActionItem; label: string }) {
    const isCritical = item.severity === "critical";

    return (
        <Link
            href={item.href}
            className={`group flex flex-col justify-between overflow-hidden rounded-[22px] md:flex-row md:items-center ${
                isCritical 
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/16" 
                : "bg-slate-950 text-white shadow-lg shadow-slate-900/16"
            } p-4 transition-all hover:scale-[1.005] active:scale-[0.99] sm:p-5`}
        >
            <div className="flex-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    isCritical ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                }`}>
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                </span>
                <h3 className="mt-2 line-clamp-2 text-balance text-lg font-bold tracking-tight text-white sm:text-xl">
                    {item.title}
                </h3>
                <p className={`mt-1 line-clamp-2 text-sm ${isCritical ? "text-rose-100" : "text-slate-300"}`}>
                    {item.reason}
                </p>
                
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {item.projectCode && (
                        <span className={`rounded-lg px-3 py-1.5 font-mono text-[13px] ${isCritical ? 'bg-rose-700 text-rose-100' : 'bg-white/10 text-slate-300'}`}>
                            {item.projectCode}
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${isCritical ? 'bg-rose-700 text-rose-100' : 'bg-white/10 text-slate-300'}`}>
                        <CalendarDays className="h-4 w-4 opacity-70" aria-hidden="true" />
                        {formatDueDate(item.dueAt)}
                    </span>
                </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-end md:mt-0">
                <div className="flex items-center gap-3 pr-2">
                    <span className="font-bold uppercase tracking-widest text-[11px] text-white/90 md:hidden">Execute Task</span>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        isCritical ? "bg-white text-rose-600" : "bg-white text-slate-900"
                    } shadow-sm group-hover:scale-110 transition-transform`}>
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, teams, currentTeam, loadTeams, setTeam } = useStore();

    const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const loadDashboardData = useCallback(async () => {
        if (!user) {
            setDashboardOverview(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const resolvedTeam = currentTeam || teams[0] || null;

            if (!currentTeam && resolvedTeam) {
                setTeam(resolvedTeam);
            }

            const overview = await getDashboardOverview(resolvedTeam?.slug, resolvedTeam?.id);

            setDashboardOverview({
                ...overview,
                workspace: {
                    ...overview.workspace,
                    teamId: resolvedTeam?.id,
                    teamName: resolvedTeam?.name || overview.workspace.teamName,
                    teamSlug: resolvedTeam?.slug || overview.workspace.teamSlug,
                    teamCount: teams.length,
                    isOwner: !!resolvedTeam && !!user && resolvedTeam.owner_id === user.id,
                },
                utility: {
                    ...overview.utility,
                    showUpgrade: !!overview.utility.showUpgrade && !!resolvedTeam && !!user && resolvedTeam.owner_id === user.id,
                    upgradeHref: resolvedTeam?.slug
                        ? `/${resolvedTeam.slug}/settings?plans=1`
                        : overview.utility.upgradeHref,
                },
            });
        } catch (error) {
            console.error("Dashboard loading error:", error);
            setDashboardOverview(null);
        } finally {
            setIsLoading(false);
        }
    }, [currentTeam, setTeam, teams, user]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (isLoading && !dashboardOverview) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex animate-pulse items-center gap-3 text-slate-400">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-400 animate-spin" />
                    <span className="text-sm font-medium">Loading workspace...</span>
                </div>
            </div>
        );
    }

    const recommendedAction = dashboardOverview?.recommendedAction;
    const actionBuckets = dashboardOverview?.actionBuckets;
    const bucketOrder: DashboardActionBucketId[] = ["needs_attention", "due_soon", "blocked", "ready_to_resume"];
    const hasAnyActions = bucketOrder.some((bucket) => (actionBuckets?.[bucket]?.length || 0) > 0);
    const startHereItem = recommendedAction
        ? {
            id: "start-here",
            title: recommendedAction.title,
            href: recommendedAction.href,
            bucket: "needs_attention" as DashboardActionBucketId,
            severity: recommendedAction.severity,
            reason: recommendedAction.reason,
            statusLabel: recommendedAction.ctaLabel,
        }
        : null;
    const projects = dashboardOverview?.projects || [];
    const healthMetrics = dashboardOverview?.healthMetrics || [];
    const showUpgradeModule = !!dashboardOverview?.utility.showUpgrade && !!dashboardOverview.utility.upgradeHref;

    return (
        <div className="min-h-screen space-y-4 overflow-x-hidden pb-28 font-sans md:space-y-6 md:pb-16">
            <InstallPrompt />
            <MobilePremiumPrompt team={currentTeam || null} />

            <div className="grid gap-4 pt-3 md:pt-4 xl:grid-cols-[1fr_320px] xl:gap-6 wrap">
                {/* Main Action Hub */}
                <div className="min-w-0 space-y-4 md:space-y-6">
                    {/* Team Health - Moved up for mobile visibility */}
                    {healthMetrics.length > 0 && (
                        <section className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm md:p-5">
                            <div className="mb-3 flex items-center justify-between gap-4 md:mb-4">
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight text-slate-900">Workspace Signals</h2>
                                <Link
                                    href="/my-tasks"
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                                >
                                    All Tasks
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                            </div>

                            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:pb-0">
                                {healthMetrics.map((metric) => (
                                    <div key={metric.id} className="w-36 shrink-0 rounded-[16px] border border-black/5 bg-slate-50 p-3 md:w-auto md:p-4">
                                        <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                                        <div className={`mt-1.5 text-2xl font-semibold tracking-tight md:text-[28px] ${getMetricToneClasses(metric.tone)}`}>
                                            {numberFormatter.format(metric.value)}
                                            <span className="text-sm md:text-lg font-medium text-slate-400 ml-0.5">{metric.suffix || ""}</span>
                                        </div>
                                        <p className="mt-1 truncate text-[11px] text-slate-400 md:text-xs">{metric.context}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {projects.length > 0 ? (
                        <>
                            <section className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm md:p-5">
                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
                                            Intervention Queue
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Start at the top, clear the issue, then move down.
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                    {bucketOrder.map((bucket) => {
                                        const meta = bucketMeta[bucket];
                                        const count = actionBuckets?.[bucket]?.length || 0;
                                        const isCritical = bucket === "needs_attention" && count > 0;
                                        const isWarning = bucket === "due_soon" && count > 0;

                                        return (
                                            <div
                                                key={bucket}
                                                className={`flex flex-col justify-between rounded-[16px] border p-3 transition-colors ${
                                                    isCritical
                                                        ? "border-rose-500/30 bg-rose-50/50 shadow-sm shadow-rose-100"
                                                        : isWarning
                                                        ? "border-amber-500/30 bg-amber-50/50 shadow-sm shadow-amber-100"
                                                        : "border-black/5 bg-slate-50/50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                                                    <meta.icon className={`h-3.5 w-3.5 ${isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-slate-400"}`} aria-hidden="true" />
                                                    <span className={isCritical ? "text-rose-900 font-bold" : isWarning ? "text-amber-900 font-bold" : "text-slate-600"}>{meta.label}</span>
                                                </div>
                                                <div className={`mt-2 text-2xl font-semibold tracking-tight md:text-3xl ${isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-slate-900"}`}>
                                                    {count}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {startHereItem && (
                                    <div className="mb-5">
                                        <DashboardPriorityActionLink item={startHereItem} label="START HERE" />
                                    </div>
                                )}

                                {!hasAnyActions ? (
                                    <EmptyState
                                        icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                                        title="Your queue is clear"
                                        description="There's nothing competing for your attention right now. You can safely explore supporting work below."
                                    />
                                ) : (
                                    <div className="space-y-6 md:space-y-8">
                                        {bucketOrder.map((bucket) => {
                                            const items = (actionBuckets?.[bucket] || []).filter((item) => item.href !== recommendedAction?.href || item.title !== recommendedAction?.title);
                                            if (items.length === 0) return null;

                                            return (
                                                <section key={bucket}>
                                                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                                                        <h3 className="text-xs md:text-sm font-semibold uppercase tracking-widest text-slate-400">{bucketMeta[bucket].label}</h3>
                                                    </div>
                                                    <div className="grid gap-3">
                                                        {items.map((item) => (
                                                            <DashboardActionLink key={item.id} item={item} />
                                                        ))}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[32px] border border-black/5 bg-white p-6 md:p-8 shadow-sm">
                                <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Resume Work</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Safe re-entry points into your projects.
                                        </p>
                                    </div>

                                    {currentTeam && (
                                        <button
                                            type="button"
                                            onClick={() => setIsProjectModalOpen(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 md:py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 shadow-sm w-full sm:w-auto"
                                        >
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                            New
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {projects.map((project) => (
                                        <Link
                                            key={project.id}
                                            href={project.href}
                                            className="group rounded-[24px] border border-black/5 bg-slate-50/50 p-5 md:p-6 transition-all hover:bg-white hover:shadow-md hover:border-black/5 hover:-translate-y-1 block"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-black/5 text-sm font-semibold text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    {project.key.charAt(0)}
                                                </div>
                                                <span className="rounded-lg bg-white border border-black/5 shadow-sm px-2.5 py-1 text-xs font-mono text-slate-500">
                                                    {project.key}
                                                </span>
                                            </div>

                                            <h3 className="mt-4 text-base font-medium text-slate-900">
                                                {project.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500 line-clamp-2 min-h-[40px]">{project.note}</p>

                                            <div className="mt-6 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[11px] font-medium text-slate-400">Open</p>
                                                    <div className="mt-0.5 text-lg font-semibold text-slate-900">
                                                        {numberFormatter.format(project.activeTaskCount)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-medium text-slate-400 text-right">Done</p>
                                                    <div className="mt-0.5 text-lg font-semibold text-slate-900 text-right">
                                                        {numberFormatter.format(project.completionRate)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : (
                        <EmptyState
                            size="hero"
                            className="shadow-sm animate-in fade-in duration-500"
                            icon={<FolderKanban className="h-10 w-10 text-slate-400" />}
                            title="No projects yet"
                            description="You don't have any projects in this workspace yet. Create your first project to start organizing work, collaborating with your team, and tracking delivery."
                            action={currentTeam ? (
                                <button
                                    type="button"
                                    onClick={() => setIsProjectModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-[16px] font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
                                >
                                    <Plus className="h-5 w-5" aria-hidden="true" />
                                    Create your first project
                                </button>
                            ) : null}
                        />
                    )}
                </div>

                {/* Right Aside */}
                <aside className="space-y-6">
                    <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">Workspaces</h2>
                            <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>

                        <div className="space-y-2">
                            {teams.map((team, index) => (
                                <button
                                    key={team.id}
                                    type="button"
                                    onClick={() => {
                                        setTeam(team);
                                        router.push("/dashboard");
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-[20px] p-2.5 transition active:scale-[0.98] ${
                                        currentTeam?.id === team.id
                                            ? "bg-slate-900 text-white shadow-md"
                                            : "bg-transparent text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                                        currentTeam?.id === team.id
                                            ? "bg-white/20 text-white"
                                            : "bg-white shadow-sm border border-black/5 text-slate-900"
                                    }`}>
                                        {team.name.charAt(0)}
                                    </div>

                                    <div className="min-w-0 flex-1 text-left">
                                        <div className={`truncate text-sm font-medium ${currentTeam?.id === team.id ? "text-white" : "text-slate-900"}`}>
                                            {team.name}
                                        </div>
                                        <div className={`truncate text-[11px] ${currentTeam?.id === team.id ? "text-slate-300" : "text-slate-500"}`}>
                                            Workspace {String(index + 1).padStart(2, "0")}
                                        </div>
                                    </div>

                                    {currentTeam?.id === team.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-white mr-2" aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                    </section>

                    {showUpgradeModule && (
                        <section className="rounded-[32px] border border-black/5 bg-slate-50 p-6">
                            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                                {dashboardOverview?.utility.planName || "Current plan"} Capacity
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                You are using <span className="font-medium text-slate-700">{numberFormatter.format(dashboardOverview?.utility.projectsUsed || 0)}</span> of <span className="font-medium text-slate-700">{numberFormatter.format(dashboardOverview?.utility.projectsLimit || 0)}</span> project slots.
                            </p>
                            <Link
                                href={dashboardOverview?.utility.upgradeHref || "#"}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-slate-600 transition"
                            >
                                Review plan options
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                        </section>
                    )}
                </aside>
            </div>

            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onSubmit={async (name, key, desc, isPrivate) => {
                    if (!currentTeam) return;
                    try {
                        await createProject(currentTeam.id, name, key, desc, isPrivate);
                        setIsProjectModalOpen(false);
                        await loadDashboardData();
                    } catch (error) {
                        console.error(error);
                    }
                }}
                currentCount={dashboardOverview?.utility.projectsUsed}
                maxCount={dashboardOverview?.utility.projectsLimit}
                teamSlug={currentTeam?.slug}
            />
        </div>
    );
}
