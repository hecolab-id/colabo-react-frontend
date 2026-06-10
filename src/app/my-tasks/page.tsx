"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/app-link";
import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    Circle,
    AlertTriangle,
} from "lucide-react";
import { getMyTasks } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/types";
import {
    formatTaskDate,
    getPriorityTone,
    getStatusTone,
    getDueDateTone,
} from "@/lib/task-ui";
import { ProjectViewModeSwitcher } from "@/components/project/project-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { MyTasksBoard } from "@/components/my-tasks/my-tasks-board";

type MyTasksViewMode = "board" | "list";
const VIEW_MODE_STORAGE_KEY = "colabo:my-tasks:view-mode";

function isTaskDone(task: Task) {
    return task.status === "DONE" || task.column?.type === "done";
}

function getTaskHref(task: Task) {
    if (!task.project?.team?.slug || !task.project.slug) {
        return "/dashboard";
    }

    const params = new URLSearchParams({
        taskId: task.id,
    });

    return `/${task.project.team.slug}/${task.project.slug}?${params.toString()}`;
}

function getTaskIdentifier(task: Task) {
    if (!task.project?.key) {
        return "Task";
    }

    return `${task.project.key}-${Math.max(1, Math.floor(task.position || 1))}`;
}

export default function MyTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<MyTasksViewMode>("list");

    const loadTasks = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            const data = await getMyTasks();
            setTasks(data || []);
        } catch (error) {
            console.error("Failed to load tasks", error);
            setTasks([]);
            setLoadError("We couldn't load your tasks. Check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (stored === "board" || stored === "list") {
            setViewMode(stored);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }, [viewMode]);

    const now = new Date();
    const upcomingCutoff = new Date(now);
    upcomingCutoff.setDate(upcomingCutoff.getDate() + 3);

    const activeTasks = tasks.filter((task) => !isTaskDone(task));
    const completedTasks = tasks.filter((task) => isTaskDone(task));
    const overdueTasks = activeTasks.filter((task) => task.due_date && new Date(task.due_date) < now);
    const dueSoonTasks = activeTasks.filter((task) => {
        if (!task.due_date) return false;

        const dueDate = new Date(task.due_date);
        return dueDate >= now && dueDate <= upcomingCutoff;
    });

    const focusTasks = [...overdueTasks, ...dueSoonTasks.filter((task) => !overdueTasks.some((item) => item.id === task.id))]
        .sort((left, right) => {
            const leftTime = left.due_date ? new Date(left.due_date).getTime() : Number.POSITIVE_INFINITY;
            const rightTime = right.due_date ? new Date(right.due_date).getTime() : Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
        })
        .slice(0, 4);

    const startHereTask = focusTasks.length > 0 ? focusTasks[0] : null;
    const remainingFocusTasks = focusTasks.slice(1);

    const remainingTasks = activeTasks
        .filter((task) => !focusTasks.some((item) => item.id === task.id))
        .sort((left, right) => {
            const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.POSITIVE_INFINITY;
            const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.POSITIVE_INFINITY;

            if (leftDue !== rightDue) {
                return leftDue - rightDue;
            }

            return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        });

    if (isLoading) {
        return (
            <main className="space-y-6 overflow-x-hidden pb-16 font-sans wrap max-w-6xl mx-auto px-4 md:px-8" aria-busy="true" aria-label="Loading tasks">
                <header className="flex flex-col gap-4 pt-6 pb-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                    <div className="min-w-0 space-y-2">
                        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200/70" />
                        <div className="h-4 w-48 animate-pulse rounded bg-slate-200/60" />
                    </div>
                    <div className="h-10 w-32 shrink-0 animate-pulse rounded-[1.1rem] bg-slate-200/60" />
                </header>
                <section>
                    <div className="mb-3 h-3 w-20 animate-pulse rounded bg-slate-200/70" />
                    <div className="h-32 animate-pulse rounded-[20px] border border-black/5 bg-white" />
                </section>
                <section>
                    <div className="mb-3 h-3 w-28 animate-pulse rounded bg-slate-200/70" />
                    <div className="grid gap-3">
                        <div className="h-24 animate-pulse rounded-[20px] border border-black/5 bg-white" />
                        <div className="h-24 animate-pulse rounded-[20px] border border-black/5 bg-white" />
                    </div>
                </section>
                <section className="rounded-[24px] border border-black/5 bg-white p-6 md:p-8 shadow-sm">
                    <div className="mb-6 h-5 w-32 animate-pulse rounded bg-slate-200/70" />
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-14 animate-pulse rounded-[20px] bg-slate-100/70" />
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="space-y-6 overflow-x-hidden pb-16 font-sans wrap max-w-6xl mx-auto px-4 md:px-8">
            <header className="flex flex-col gap-4 pt-6 pb-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        Your execution queue
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                        {tasks.length === 0 ? "No assignments yet." : `${activeTasks.length} active tasks waiting for your input.`}
                    </p>
                </div>

                <div className="shrink-0">
                    <ProjectViewModeSwitcher
                        viewMode={viewMode}
                        onChange={(mode) => {
                            if (mode === "board" || mode === "list") {
                                setViewMode(mode);
                            }
                        }}
                        availableModes={["board", "list"]}
                    />
                </div>
            </header>

            {loadError ? (
                <EmptyState
                    icon={<AlertCircle className="h-6 w-6 text-[var(--danger-fg)]" aria-hidden="true" />}
                    title="Something went wrong"
                    description={loadError}
                    action={
                        <button
                            type="button"
                            onClick={loadTasks}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_36px_rgba(109,93,252,0.22)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.985]"
                        >
                            Try again
                        </button>
                    }
                />
            ) : viewMode === "board" ? (
                <section>
                    <MyTasksBoard tasks={tasks} getTaskHref={getTaskHref} />
                </section>
            ) : (
                <>
            {startHereTask && (
                <section>
                    <div className="mb-3">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Start Here
                        </h2>
                    </div>
                    <Link
                        href={getTaskHref(startHereTask)}
                        className="group flex flex-col gap-4 rounded-[20px] border border-black/5 bg-white p-5 shadow-sm ring-1 ring-primary/15 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                    >
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Highest Priority
                            </span>
                            <h3 className="mt-3 break-words text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                                {startHereTask.title}
                            </h3>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] font-medium text-slate-500">
                                <span className="font-mono text-slate-400">
                                    {getTaskIdentifier(startHereTask)}
                                </span>
                                {startHereTask.project && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                        <span>{startHereTask.project.name}</span>
                                    </>
                                )}
                                {startHereTask.due_date && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                            {formatTaskDate(startHereTask.due_date)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors group-hover:text-primary">
                            Open Task
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </div>
                    </Link>
                </section>
            )}

            {remainingFocusTasks.length > 0 && (
                <section>
                    <div className="mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Needs Attention
                        </h2>
                    </div>
                    <div className="grid gap-3">
                        {remainingFocusTasks.map((task) => {
                            const dueTone = getDueDateTone(task.due_date ?? undefined);
                            const priorityTone = getPriorityTone(task.priority);
                            const statusTone = getStatusTone(task.status);

                            return (
                                <Link
                                    key={task.id}
                                    href={getTaskHref(task)}
                                    className="group block rounded-[20px] border border-black/5 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="min-w-0 break-words text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-700">
                                                {task.title}
                                            </h3>

                                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-slate-500">
                                                <span className="font-mono text-slate-400">
                                                    {getTaskIdentifier(task)}
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className={cn(statusTone.textClassName)}>
                                                    {statusTone.label}
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className={cn(priorityTone.textClassName)}>
                                                    {priorityTone.label} Priority
                                                </span>
                                                
                                                {task.project && (
                                                    <>
                                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                        <span>{task.project.name}</span>
                                                    </>
                                                )}

                                                {task.due_date && (
                                                    <>
                                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                        <span className={cn("inline-flex items-center gap-1.5", dueTone.className)}>
                                                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                                            {formatTaskDate(task.due_date)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-400 transition-colors group-hover:text-slate-900">
                                            Open Task
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-[24px] border border-black/5 bg-white p-6 md:p-8 shadow-sm">
                <div className="mb-6 flex items-baseline justify-between">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">All Tasks</h2>
                    {completedTasks.length > 0 ? (
                        <span className="text-xs font-medium text-slate-400">
                            {completedTasks.length} completed
                        </span>
                    ) : null}
                </div>

                {tasks.length === 0 ? (
                    <EmptyState
                        icon={<Circle className="h-6 w-6 text-slate-400" aria-hidden="true" />}
                        title="No tasks assigned yet"
                        description="When tasks are assigned to you, they'll appear here sorted by priority and due date."
                    />
                ) : (
                    <div className="space-y-2">
                        {[...remainingTasks, ...completedTasks].map((task) => {
                            const dueTone = getDueDateTone(task.due_date ?? undefined);
                            const statusTone = getStatusTone(task.status);
                            const done = isTaskDone(task);

                            return (
                                <Link
                                    key={task.id}
                                    href={getTaskHref(task)}
                                    className={cn(
                                        "group flex flex-col gap-3 rounded-[20px] p-4 transition-all hover:bg-slate-50 active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between",
                                        done ? "opacity-60 grayscale hover:grayscale-0" : ""
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
                                            <h3 className={cn("min-w-0 break-words text-[15px] font-semibold text-slate-900")}>
                                                {task.title}
                                            </h3>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] font-medium text-slate-500">
                                            <span className="font-mono text-slate-400">
                                                {getTaskIdentifier(task)}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className={cn(statusTone.textClassName)}>
                                                {statusTone.label}
                                            </span>
                                            
                                            {task.project && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span>{task.project.name}</span>
                                                </>
                                            )}

                                            {task.due_date ? (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className={cn("inline-flex items-center gap-1.5", dueTone.className)}>
                                                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {formatTaskDate(task.due_date)}
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-slate-400 opacity-100 transition-all group-hover:text-slate-900 md:opacity-0 md:group-hover:opacity-100 md:pl-4">
                                        Open Task
                                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
                </>
            )}
        </main>
    );
}
