"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, FolderKanban, Loader2, Plus } from "lucide-react";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { EmailReminderBanner } from "@/components/dashboard/email-reminder-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { toast } from "@/components/ui/toast";
import { createProject, getDashboardOverview } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { DashboardActionItem, DashboardOverview } from "@/lib/types";

const numberFormatter = new Intl.NumberFormat();
const TASK_PREVIEW_LIMIT = 3;
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const bucketLabels = {
    needs_attention: "Overdue",
    due_soon: "Due soon",
    blocked: "Stalled",
    ready_to_resume: "Ready to resume",
};
const rowLinkClass = "group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5";

function TaskRow({ item }: { item: DashboardActionItem }) {
    const tone = item.severity === "critical"
        ? "text-[var(--danger-fg)]"
        : item.severity === "warning" ? "text-[var(--warning-fg)]" : "text-muted-foreground";
    const dueDate = item.dueAt ? new Date(item.dueAt) : null;

    return (
        <li>
            <Link href={item.href} className={rowLinkClass}>
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className={`font-medium ${tone}`}>{bucketLabels[item.bucket]}</span>
                        {item.projectName || item.projectCode ? (
                            <span className="break-words text-muted-foreground">{item.projectName || item.projectCode}</span>
                        ) : null}
                    </div>
                    <h3 className="break-words text-sm font-semibold leading-6 text-foreground">{item.title}</h3>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{item.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-muted-foreground">
                    {dueDate && !Number.isNaN(dueDate.getTime()) ? (
                        <time dateTime={item.dueAt!} className="hidden text-xs sm:block">{dateFormatter.format(dueDate)}</time>
                    ) : null}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </div>
            </Link>
        </li>
    );
}

function ProjectRow({ project }: { project: DashboardOverview["projects"][number] }) {
    return (
        <li>
            <Link href={project.href} className={rowLinkClass}>
                <FolderKanban className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="break-words text-sm font-semibold leading-6 text-foreground">{project.name}</h3>
                        <span className="text-xs text-muted-foreground">{project.key}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {numberFormatter.format(project.activeTaskCount)} open · {numberFormatter.format(project.completedCount)} of {numberFormatter.format(project.taskCount)} completed
                    </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
        </li>
    );
}

export default function DashboardPage() {
    const { user, teams, currentTeam, loadTeams, setTeam } = useStore();

    const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [taskView, setTaskView] = useState<"attention" | "other">("attention");
    const [showAllTasks, setShowAllTasks] = useState(false);
    const [loadError, setLoadError] = useState(false);

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
        setLoadError(false);

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
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, [currentTeam, setTeam, teams, user]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    useEffect(() => {
        setTaskView("attention");
        setShowAllTasks(false);
    }, [currentTeam?.id]);

    if (isLoading && !dashboardOverview) {
        return (
            <div role="status" className="flex h-[60vh] items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span className="text-sm">Loading dashboard...</span>
            </div>
        );
    }

    const actionBuckets = dashboardOverview?.actionBuckets;
    const attentionItems = [
        ...(actionBuckets?.needs_attention || []),
        ...(actionBuckets?.due_soon || []),
        ...(actionBuckets?.blocked || []),
    ];
    const otherItems = actionBuckets?.ready_to_resume || [];
    const selectedItems = taskView === "attention" ? attentionItems : otherItems;
    const visibleItems = showAllTasks ? selectedItems : selectedItems.slice(0, TASK_PREVIEW_LIMIT);
    const projects = dashboardOverview?.projects || [];
    const healthMetrics = dashboardOverview?.healthMetrics || [];
    const teamSlug = currentTeam?.slug || dashboardOverview?.workspace.teamSlug;
    const showUpgrade = !!dashboardOverview?.utility.showUpgrade && !!dashboardOverview.utility.upgradeHref;

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8 pb-6 md:space-y-10">
            <InstallPrompt />

            <header className="max-md:sr-only">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Dashboard</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {dashboardOverview?.workspace.teamName || currentTeam?.name || "Your workspace"}
                </p>
            </header>

            {loadError ? (
                <Alert variant="danger">
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                        <p>Couldn't load your dashboard. Please try again.</p>
                        <Button type="button" variant="secondary" size="sm" onClick={loadDashboardData} disabled={isLoading}>
                            {isLoading ? "Retrying..." : "Try again"}
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : null}

            {dashboardOverview ? (
                <>
                    <section aria-labelledby="dashboard-tasks-title" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="dashboard-tasks-title" className="text-lg font-semibold text-foreground">Your tasks</h2>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/my-tasks">View all tasks <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                            </Button>
                        </div>

                        {attentionItems.length > 0 || otherItems.length > 0 ? (
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter dashboard tasks">
                                {(["attention", "other"] as const).map((view) => (
                                    <Button
                                        key={view}
                                        type="button"
                                        variant={taskView === view ? "secondary" : "ghost"}
                                        size="sm"
                                        aria-pressed={taskView === view}
                                        aria-controls="dashboard-task-list"
                                        onClick={() => { setTaskView(view); setShowAllTasks(false); }}
                                    >
                                        {view === "attention" ? "Needs attention" : "Ready to resume"}
                                    </Button>
                                ))}
                            </div>
                        ) : null}

                        {visibleItems.length > 0 ? (
                            <Card variant="solid" className="overflow-hidden">
                                <ul id="dashboard-task-list" className="divide-y divide-border">
                                    {visibleItems.map((item) => <TaskRow key={item.id} item={item} />)}
                                </ul>
                                {selectedItems.length > TASK_PREVIEW_LIMIT ? (
                                    <div className="border-t border-border px-4 py-2 sm:px-5">
                                        <Button type="button" variant="ghost" size="sm" aria-expanded={showAllTasks} aria-controls="dashboard-task-list" onClick={() => setShowAllTasks(!showAllTasks)}>
                                            {showAllTasks ? "Show fewer tasks" : `Show ${selectedItems.length - TASK_PREVIEW_LIMIT} more tasks`}
                                        </Button>
                                    </div>
                                ) : null}
                            </Card>
                        ) : (
                            <div id="dashboard-task-list" className="flex items-start gap-3 py-5">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success-fg)]" aria-hidden="true" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">{taskView === "attention" ? "You're all caught up" : "No tasks to resume"}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{taskView === "attention" ? "No overdue, upcoming, or stalled tasks right now." : "Open your task list to see all assigned work."}</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section aria-labelledby="dashboard-projects-title" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="dashboard-projects-title" className="text-lg font-semibold text-foreground">Projects</h2>
                            {currentTeam ? (
                                <Button type="button" variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(true)}>
                                    <Plus className="h-4 w-4" aria-hidden="true" /> New project
                                </Button>
                            ) : null}
                        </div>
                        {projects.length > 0 ? (
                            <>
                                <Card variant="solid" className="overflow-hidden">
                                    <ul className="divide-y divide-border">
                                        {projects.map((project) => <ProjectRow key={project.id} project={project} />)}
                                    </ul>
                                </Card>
                                {teamSlug ? (
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/${teamSlug}`}>View all projects <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                                    </Button>
                                ) : null}
                            </>
                        ) : (
                            <EmptyState
                                icon={<FolderKanban className="h-6 w-6" />}
                                title="No projects yet"
                                description="Create a project to start organizing your team's work."
                            />
                        )}
                    </section>

                    {healthMetrics.length > 0 || showUpgrade ? (
                        <details className="group border-t border-border pt-5">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                                Workspace overview
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                            </summary>
                            <dl className="grid gap-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                                {healthMetrics.map((metric) => (
                                    <div key={metric.id}>
                                        <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                                        <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{numberFormatter.format(metric.value)}{metric.suffix || ""}</dd>
                                        <dd className="mt-1 text-xs leading-5 text-muted-foreground">{metric.context}</dd>
                                    </div>
                                ))}
                            </dl>
                            {showUpgrade ? (
                                <Button asChild variant="secondary" size="sm" className="mb-4">
                                    <Link href={dashboardOverview.utility.upgradeHref!}>Review plan options <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                                </Button>
                            ) : null}
                        </details>
                    ) : null}
                </>
            ) : null}

            <EmailReminderBanner />
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
                        toast.error("Couldn't create the project. Please try again.");
                    }
                }}
                currentCount={dashboardOverview?.utility.projectsUsed}
                maxCount={dashboardOverview?.utility.projectsLimit}
                teamSlug={currentTeam?.slug}
            />
        </div>
    );
}
