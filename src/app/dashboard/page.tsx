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
            row: "border-rose-200/70 bg-rose-50/45 hover:border-rose-300/80",
            badge: "border-rose-200 bg-rose-100/70 text-rose-800",
            accent: "text-rose-700",
            rail: "bg-rose-600",
            iconBg: "bg-rose-100 text-rose-700",
            command: "border-rose-500 bg-rose-600 text-white shadow-[0_20px_50px_rgba(225,29,72,0.20)]",
            commandMuted: "text-rose-100",
        };
    }

    if (severity === "warning") {
        return {
            row: "border-amber-200/70 bg-amber-50/45 hover:border-amber-300/80",
            badge: "border-amber-200 bg-amber-100/70 text-amber-800",
            accent: "text-amber-700",
            rail: "bg-amber-500",
            iconBg: "bg-amber-100 text-amber-700",
            command: "border-amber-500 bg-primary-dark text-white shadow-[0_20px_50px_rgba(51,35,127,0.24)]",
            commandMuted: "text-amber-100",
        };
    }

    if (severity === "stable") {
        return {
            row: "border-emerald-200/70 bg-emerald-50/45 hover:border-emerald-300/80",
            badge: "border-emerald-200 bg-emerald-100/70 text-emerald-800",
            accent: "text-emerald-700",
            rail: "bg-emerald-500",
            iconBg: "bg-emerald-100 text-emerald-700",
            command: "border-emerald-500 bg-primary-dark text-white shadow-[0_20px_50px_rgba(51,35,127,0.24)]",
            commandMuted: "text-emerald-100",
        };
    }

    return {
        row: "border-slate-200 bg-white hover:border-slate-300",
        badge: "border-slate-200 bg-slate-100 text-slate-700",
        accent: "text-slate-700",
        rail: "bg-slate-400",
        iconBg: "bg-slate-100 text-slate-600",
        command: "border-primary-dark bg-primary-dark text-white shadow-[0_20px_50px_rgba(51,35,127,0.24)]",
        commandMuted: "text-slate-300",
    };
}

function getMetricToneClasses(tone: DashboardActionSeverity) {
    if (tone === "critical") return "text-rose-600";
    if (tone === "warning") return "text-amber-600";
    if (tone === "stable") return "text-emerald-600";
    return "text-slate-900";
}

function getBucketTone(bucket: DashboardActionBucketId, count: number): DashboardActionSeverity {
    if (count <= 0) return "neutral";
    if (bucket === "needs_attention") return "critical";
    if (bucket === "due_soon" || bucket === "blocked") return "warning";
    if (bucket === "ready_to_resume") return "stable";
    return "neutral";
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
            className="group grid min-h-[3.9rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 md:px-5"
        >
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.rail}`} aria-hidden="true" />
                    {item.projectCode && (
                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                            {item.projectCode}
                        </span>
                    )}
                    {item.statusLabel && (
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                            {item.statusLabel}
                        </span>
                    )}
                    <h4 className="min-w-0 truncate text-[14px] font-semibold tracking-tight text-slate-950">
                        {item.title}
                    </h4>
                </div>
                <p className="mt-1 line-clamp-1 pl-3.5 text-[13px] leading-5 text-slate-500">{item.reason}</p>
            </div>

            <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-slate-400 md:inline-flex">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDueDate(item.dueAt)}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
        </Link>
    );
}

function DashboardPriorityActionLink({ item, label }: { item: DashboardActionItem; label: string }) {
    const styles = getSeverityClasses(item.severity);

    return (
        <Link
            href={item.href}
            className={`group relative grid overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5 ${styles.command}`}
        >
            <div className="absolute inset-y-0 left-0 w-1.5 bg-white/55" aria-hidden="true" />
            <div className="min-w-0 pl-1">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                </span>
                <h3 className="mt-2 line-clamp-2 text-balance text-lg font-bold tracking-tight text-white sm:text-xl">
                    {item.title}
                </h3>
                <p className={`mt-1 line-clamp-2 text-sm ${styles.commandMuted}`}>
                    {item.reason}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                    {item.projectCode && (
                        <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-white/85">
                            {item.projectCode}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-white/85">
                        <CalendarDays className="h-4 w-4 opacity-70" aria-hidden="true" />
                        {formatDueDate(item.dueAt)}
                    </span>
                </div>
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-4 sm:mt-0 sm:border-t-0 sm:pt-0">
                <span className="font-bold uppercase tracking-widest text-[11px] text-white/80 sm:hidden">Execute Task</span>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-sm transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
}

function ProjectResumeLink({ project }: { project: DashboardOverview["projects"][number] }) {
    return (
        <Link
            href={project.href}
            className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] active:translate-y-0 active:scale-[0.99]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-500">
                        {project.key}
                    </span>
                    <h3 className="mt-3 truncate text-[15px] font-semibold tracking-tight text-slate-950">
                        {project.name}
                    </h3>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors group-hover:border-primary-dark group-hover:bg-primary-dark group-hover:text-white">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </div>
            </div>

            <p className="mt-2 min-h-[40px] line-clamp-2 text-sm leading-5 text-slate-500">{project.note}</p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <div
                    className="h-full rounded-full bg-primary-dark transition-[width]"
                    style={{ width: `${project.completionRate}%` }}
                />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Open</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{numberFormatter.format(project.activeTaskCount)}</p>
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Done</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{numberFormatter.format(project.completedCount)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">Rate</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{numberFormatter.format(project.completionRate)}%</p>
                </div>
            </div>
        </Link>
    );
}

function MobileProjectResumeLink({ project }: { project: DashboardOverview["projects"][number] }) {
    return (
        <Link
            href={project.href}
            className="group block rounded-2xl border border-slate-200 bg-white p-3.5 active:scale-[0.99]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-500">
                            {project.key}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                            {numberFormatter.format(project.activeTaskCount)} open
                        </span>
                    </div>
                    <h3 className="mt-2 truncate text-[15px] font-semibold tracking-tight text-slate-950">
                        {project.name}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">{project.note}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-dark text-white">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div
                        className="h-full rounded-full bg-primary-dark"
                        style={{ width: `${project.completionRate}%` }}
                    />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-slate-500">
                    {numberFormatter.format(project.completionRate)}%
                </span>
            </div>
        </Link>
    );
}

function MobileUrgentActionLink({ item }: { item: DashboardActionItem }) {
    const styles = getSeverityClasses(item.severity);

    return (
        <Link
            href={item.href}
            className="relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 pl-4 active:scale-[0.99]"
        >
            <div className={`absolute inset-y-0 left-0 w-1 ${styles.rail}`} aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        {item.projectCode && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                                {item.projectCode}
                            </span>
                        )}
                        <span className={`truncate text-xs font-semibold ${styles.accent}`}>
                            {formatDueDate(item.dueAt)}
                        </span>
                    </div>
                    <h3 className="mt-2 truncate text-[14px] font-semibold tracking-tight text-slate-950">
                        {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">{item.reason}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
    const mobileUrgentItems = [
        ...(actionBuckets?.needs_attention || []),
        ...(actionBuckets?.due_soon || []),
        ...(actionBuckets?.blocked || []),
    ].filter((item) => item.href !== recommendedAction?.href || item.title !== recommendedAction?.title).slice(0, 3);

    return (
        <div className="min-h-screen overflow-x-hidden pb-32 font-sans md:pb-16">
            <InstallPrompt />
            <MobilePremiumPrompt team={currentTeam || null} />

            <div className="grid gap-4 pt-3 md:pt-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
                <div className="min-w-0 space-y-5">
                    <section className="space-y-3 sm:hidden">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                Workspace
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <h1 className="min-w-0 truncate text-[22px] font-semibold tracking-tight text-slate-950">
                                    {dashboardOverview?.workspace.teamName || currentTeam?.name || "Workspace"}
                                </h1>
                                <Link
                                    href="/my-tasks"
                                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-primary-dark px-3 text-xs font-semibold text-white active:scale-[0.98]"
                                >
                                    My Tasks
                                </Link>
                            </div>
                        </div>

                        {startHereItem && (
                            <Link
                                href={startHereItem.href}
                                className={`relative block overflow-hidden rounded-2xl border p-4 active:scale-[0.99] ${getSeverityClasses(startHereItem.severity).command}`}
                            >
                                <div className="absolute inset-y-0 left-0 w-1.5 bg-white/55" aria-hidden="true" />
                                <div className="pl-1">
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                        Start Here
                                    </span>
                                    <h2 className="mt-2 line-clamp-2 text-[17px] font-bold tracking-tight text-white">
                                        {startHereItem.title}
                                    </h2>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <p className={`line-clamp-1 text-[13px] ${getSeverityClasses(startHereItem.severity).commandMuted}`}>
                                            {startHereItem.reason}
                                        </p>
                                        <ArrowRight className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                                    </div>
                                </div>
                            </Link>
                        )}
                    </section>

                    <section className="hidden overflow-hidden rounded-[18px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:block mt-0">
                        <div className="border-b border-slate-200 bg-white/85 px-4 py-3 sm:px-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        Command Center
                                    </p>
                                    <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                                        {dashboardOverview?.workspace.teamName || currentTeam?.name || "Workspace"}
                                    </h1>
                                </div>
                                <Link
                                    href="/my-tasks"
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
                                >
                                    All Tasks
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="border-b border-slate-200 p-4 sm:p-5 xl:border-b-0 xl:border-r">
                                {startHereItem ? (
                                    <DashboardPriorityActionLink item={startHereItem} label="Start Here" />
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                                            No urgent interventions right now
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Your queue looks clear. Use this moment to resume a project or review assigned tasks.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 xl:grid-cols-2">
                                {bucketOrder.map((bucket) => {
                                    const meta = bucketMeta[bucket];
                                    const count = actionBuckets?.[bucket]?.length || 0;
                                    const tone = getBucketTone(bucket, count);
                                    const styles = getSeverityClasses(tone);

                                    return (
                                        <div key={bucket} className="min-h-[126px] bg-white/65 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <meta.icon className={`h-4 w-4 ${styles.accent}`} aria-hidden="true" />
                                                <span className={`h-2 w-2 rounded-full ${styles.rail}`} aria-hidden="true" />
                                            </div>
                                            <div className={`mt-4 text-3xl font-semibold tracking-tight ${getMetricToneClasses(tone)}`}>
                                                {count}
                                            </div>
                                            <p className="mt-1 text-[12px] font-semibold text-slate-700">{meta.label}</p>
                                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{meta.summary}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {healthMetrics.length > 0 && (
                            <div className="border-t border-slate-200 bg-gray-50 px-4 py-3 sm:px-5">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {healthMetrics.map((metric) => (
                                        <div key={metric.id} className="min-w-0 border-l border-white/10 pl-3">
                                            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">{metric.label}</p>
                                            <div className={`mt-1 text-xl font-semibold tracking-tight ${metric.tone === "critical" ? "text-rose-500" : metric.tone === "warning" ? "text-amber-500" : metric.tone === "stable" ? "text-emerald-500" : "text-slate-700"}`}>
                                                {numberFormatter.format(metric.value)}
                                                <span className="ml-0.5 text-sm font-medium text-slate-600">{metric.suffix || ""}</span>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-slate-600">{metric.context}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {projects.length > 0 ? (
                        <>
                            <div className="space-y-4 sm:hidden">
                                <section className="rounded-2xl border border-slate-200 bg-white">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                                Resume Work
                                            </p>
                                            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950">
                                                Open a project
                                            </h2>
                                        </div>
                                        {currentTeam && (
                                            <button
                                                type="button"
                                                onClick={() => setIsProjectModalOpen(true)}
                                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 active:scale-[0.98]"
                                            >
                                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                                New
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-2.5 p-3">
                                        {projects.map((project) => (
                                            <MobileProjectResumeLink key={project.id} project={project} />
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                                Urgent Tasks
                                            </p>
                                            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">
                                                Quick check
                                            </h2>
                                        </div>
                                        <Link
                                            href="/my-tasks"
                                            className="text-xs font-semibold text-slate-500 active:text-slate-900"
                                        >
                                            View all
                                        </Link>
                                    </div>

                                    <div className="grid gap-2.5 p-3">
                                        {mobileUrgentItems.length > 0 ? (
                                            mobileUrgentItems.map((item) => (
                                                <MobileUrgentActionLink key={item.id} item={item} />
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                                                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" aria-hidden="true" />
                                                <h3 className="mt-2 text-sm font-semibold text-slate-950">Your queue is clear</h3>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    No urgent task needs attention right now.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="hidden space-y-5 sm:block">
                            <section className="overflow-hidden rounded-[18px] border border-slate-300 bg-white shadow-[0_18px_44px_-42px_rgba(15,23,42,0.42)]">
                                <div className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                Intervention Queue
                                            </p>
                                            <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-slate-950">
                                                Priority signals
                                            </h2>
                                        </div>
                                        {hasAnyActions ? (
                                            <Link href="/my-tasks" className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                                                {bucketOrder.reduce((total, bucket) => total + (actionBuckets?.[bucket]?.length || 0), 0)} open
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>

                                <div>
                                    {!hasAnyActions ? (
                                        <EmptyState
                                            className="m-5 rounded-2xl border-slate-200 bg-slate-50 shadow-none"
                                            icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                                            title="Your queue is clear"
                                            description="There's nothing competing for your attention right now. You can safely explore supporting work below."
                                        />
                                    ) : (
                                        <div className="divide-y divide-slate-200">
                                            {bucketOrder.map((bucket) => {
                                                const items = (actionBuckets?.[bucket] || []).filter((item) => item.href !== recommendedAction?.href || item.title !== recommendedAction?.title);
                                                if (items.length === 0) return null;
                                                const visibleItems = items.slice(0, 2);
                                                const overflowCount = Math.max(0, items.length - visibleItems.length);
                                                const meta = bucketMeta[bucket];
                                                const tone = getBucketTone(bucket, items.length);
                                                const styles = getSeverityClasses(tone);

                                                return (
                                                    <section key={bucket}>
                                                        <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                                                            <div className="flex min-w-0 items-center gap-2.5">
                                                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.rail}`} aria-hidden="true" />
                                                                <meta.icon className={`h-3.5 w-3.5 ${styles.accent}`} aria-hidden="true" />
                                                                <div className="min-w-0">
                                                                    <h3 className="truncate text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600">{meta.label}</h3>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-400">{items.length}</span>
                                                        </div>
                                                        <div className="divide-y divide-slate-200/80">
                                                            {visibleItems.map((item) => (
                                                                <DashboardActionLink key={item.id} item={item} />
                                                            ))}
                                                            {overflowCount > 0 ? (
                                                                <Link href="/my-tasks" className="block px-4 py-2 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary-700 sm:px-5">
                                                                    View {overflowCount} more in My Tasks
                                                                </Link>
                                                            ) : null}
                                                        </div>
                                                    </section>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-[18px] border border-slate-300 bg-white">
                                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                            Resume Work
                                        </p>
                                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                                            Safe re-entry points into your projects.
                                        </h2>
                                    </div>

                                    {currentTeam && (
                                        <button
                                            type="button"
                                            onClick={() => setIsProjectModalOpen(true)}
                                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
                                        >
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                            New
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 2xl:grid-cols-3">
                                    {projects.map((project) => (
                                        <ProjectResumeLink key={project.id} project={project} />
                                    ))}
                                </div>
                            </section>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            size="hero"
                            className="animate-in rounded-[18px] border-slate-300 bg-white shadow-none fade-in duration-500"
                            icon={<FolderKanban className="h-10 w-10 text-slate-400" />}
                            title="No projects yet"
                            description="You don't have any projects in this workspace yet. Create your first project to start organizing work, collaborating with your team, and tracking delivery."
                            action={currentTeam ? (
                                <button
                                    type="button"
                                    onClick={() => setIsProjectModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-dark px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-primary-dark-hover active:scale-[0.98]"
                                >
                                    <Plus className="h-5 w-5" aria-hidden="true" />
                                    Create your first project
                                </button>
                            ) : null}
                        />
                    )}
                </div>

                <aside className="hidden space-y-4 sm:block mt-5">
                    <section className="rounded-[18px] border border-slate-300 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <h2 className="text-sm font-semibold tracking-tight text-slate-950">Workspaces</h2>
                            <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>

                        <div className="space-y-1 p-2">
                            {teams.map((team, index) => (
                                <button
                                    key={team.id}
                                    type="button"
                                    onClick={() => {
                                        setTeam(team);
                                        router.push("/dashboard");
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 transition active:scale-[0.98] ${
                                        currentTeam?.id === team.id
                                            ? "bg-primary-dark text-white shadow-[0_16px_32px_-24px_rgba(51,35,127,0.65)]"
                                            : "bg-transparent text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                                        currentTeam?.id === team.id
                                            ? "bg-white/15 text-white"
                                            : "border border-slate-200 bg-white text-slate-900"
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

                                    {currentTeam?.id === team.id && <CheckCircle2 className="mr-1 h-4 w-4 shrink-0 text-white" aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                    </section>

                    {showUpgradeModule && (
                        <section className="rounded-[18px] border border-slate-300 bg-slate-50 p-4">
                            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                                {dashboardOverview?.utility.planName || "Current plan"} Capacity
                            </h3>
                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                You are using <span className="font-medium text-slate-700">{numberFormatter.format(dashboardOverview?.utility.projectsUsed || 0)}</span> of <span className="font-medium text-slate-700">{numberFormatter.format(dashboardOverview?.utility.projectsLimit || 0)}</span> project slots.
                            </p>
                            <Link
                                href={dashboardOverview?.utility.upgradeHref || "#"}
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition hover:text-slate-600"
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
