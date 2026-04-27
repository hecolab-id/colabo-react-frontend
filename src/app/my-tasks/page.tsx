"use client";

import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import {
    ArrowRight,
    CalendarDays,
    Circle,
    ListTodo,
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

    useEffect(() => {
        async function loadTasks() {
            try {
                setIsLoading(true);
                const data = await getMyTasks();
                setTasks(data || []);
            } catch (error) {
                console.error("Failed to load tasks", error);
                setTasks([]);
            } finally {
                setIsLoading(false);
            }
        }

        loadTasks();
    }, []);

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
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex animate-pulse items-center gap-3 text-slate-400">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-400 animate-spin" />
                    <span className="text-sm font-medium">Loading tasks...</span>
                </div>
            </div>
        );
    }

    return (
        <main className="space-y-8 overflow-x-hidden pb-16 font-sans wrap max-w-6xl mx-auto px-4 md:px-8">
            <header className="pt-8 pb-4 md:pt-12 md:pb-6">
                <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-6 shadow-sm">
                        <ListTodo className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                        My Tasks
                    </div>
                    
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl text-balance">
                        Your execution queue
                    </h1>
                    <p className="mt-4 text-lg text-slate-500 max-w-2xl leading-relaxed text-balance">
                        {tasks.length === 0 ? "No assignments yet." : `${activeTasks.length} active tasks waiting for your input.`}
                    </p>
                </div>
            </header>

            {startHereTask && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    <div className="mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Start Here
                        </h2>
                    </div>
                    <Link
                        href={getTaskHref(startHereTask)}
                        className="group flex flex-col md:flex-row justify-between md:items-center overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-[1.01] active:scale-[0.99] p-6 sm:p-8"
                    >
                        <div className="flex-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white mb-4">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                Highest Priority
                            </span>
                            <h3 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl text-white">
                                {startHereTask.title}
                            </h3>
                            
                            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-300 font-medium">
                                <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-[13px]">
                                    {getTaskIdentifier(startHereTask)}
                                </span>
                                {startHereTask.project && (
                                    <>
                                        <span className="px-2 opacity-50">•</span>
                                        <span>{startHereTask.project.name}</span>
                                    </>
                                )}
                                {startHereTask.due_date && (
                                    <>
                                        <span className="px-2 opacity-50">•</span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays className="h-4 w-4 opacity-70" aria-hidden="true" />
                                            {formatTaskDate(startHereTask.due_date)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 md:mt-0 flex shrink-0 items-center justify-end">
                            <div className="flex items-center gap-3 pr-2">
                                <span className="font-semibold text-white/90">Open Task</span>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm group-hover:scale-110 transition-transform">
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </section>
            )}

            {remainingFocusTasks.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
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

            <section className="rounded-[32px] border border-black/5 bg-white p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                <div className="mb-8">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">All Active Tasks</h2>
                </div>

                {tasks.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm mb-4">
                            <Circle className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No tasks assigned yet</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
                            When tasks are assigned to you, they&apos;ll appear here sorted by priority and due date.
                        </p>
                    </div>
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

                                    <div className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:text-slate-900 md:pl-4">
                                        Open Task
                                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
