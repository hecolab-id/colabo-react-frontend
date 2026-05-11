"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "@/lib/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, CircleDot } from "lucide-react";
import { Column, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    CalendarDateBasis,
    formatTaskDate,
    getLocalDateKey,
    getMonthGridDates,
    getTaskCalendarDate,
    groupTasksByCalendarDate,
    priorityToneMap,
} from "@/lib/task-ui";
import { TaskDetailModal } from "./task-detail-modal";

interface TaskCalendarViewProps {
    tasks: Task[];
    columns: Column[];
    initialTaskId?: string;
    onUpdate?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
});

const dayHeadingFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
});

export function TaskCalendarView({ tasks, columns, initialTaskId, onUpdate, onDelete }: TaskCalendarViewProps) {
    const [dateBasis, setDateBasis] = useState<CalendarDateBasis>("due");
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDateKey, setSelectedDateKey] = useState(() => getLocalDateKey(new Date().toISOString()) ?? "");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialTask = useMemo(
        () => (initialTaskId ? tasks.find((item) => item.id === initialTaskId) ?? null : null),
        [initialTaskId, tasks]
    );
    const initialTaskDateKey = useMemo(() => {
        if (!initialTask) {
            return null;
        }

        const taskDate = getTaskCalendarDate(initialTask, dateBasis) || initialTask.created_at;
        return getLocalDateKey(taskDate);
    }, [dateBasis, initialTask]);
    const effectiveSelectedDateKey = initialTaskDateKey ?? selectedDateKey;
    const effectiveCurrentMonth = useMemo(() => {
        if (!initialTaskDateKey) {
            return currentMonth;
        }

        return new Date(`${initialTaskDateKey}T00:00:00`);
    }, [currentMonth, initialTaskDateKey]);

    const groupedTasks = useMemo(() => groupTasksByCalendarDate(tasks, dateBasis), [dateBasis, tasks]);
    const monthGridDates = useMemo(() => getMonthGridDates(effectiveCurrentMonth), [effectiveCurrentMonth]);

    const selectedDateTasks = useMemo(() => {
        const selectedTasks = groupedTasks[effectiveSelectedDateKey] || [];
        return [...selectedTasks].sort((left, right) => {
            const leftDate = new Date(getTaskCalendarDate(left, dateBasis) || left.created_at).getTime();
            const rightDate = new Date(getTaskCalendarDate(right, dateBasis) || right.created_at).getTime();
            return leftDate - rightDate;
        });
    }, [dateBasis, effectiveSelectedDateKey, groupedTasks]);
    const activeTask = selectedTask ?? initialTask;

    const selectedDateLabel = effectiveSelectedDateKey
        ? dayHeadingFormatter.format(new Date(`${effectiveSelectedDateKey}T00:00:00`))
        : "No day selected";

    useEffect(() => {
        if (!initialTask) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("taskId");
        const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [initialTask, pathname, router, searchParams]);

    const changeMonth = (offset: number) => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const jumpToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        const todayKey = getLocalDateKey(today.toISOString());
        if (todayKey) {
            setSelectedDateKey(todayKey);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-3 pb-20 md:gap-5 lg:flex-row lg:items-start">
                <section className="flex-1 overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/84 p-3 shadow-[0_26px_64px_-42px_rgba(15,23,42,0.28)] backdrop-blur-2xl md:rounded-[2rem] md:p-8">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6 md:gap-4">
                        <div className="grid grid-cols-2 rounded-full border border-black/5 bg-slate-50/90 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:inline-flex md:p-1">
                            {([
                                ["due", "Due"],
                                ["created", "Created"],
                            ] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setDateBasis(value)}
                                    className={cn(
                                        "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all focus-visible:outline-none md:px-5 md:py-2 md:text-[13px]",
                                        dateBasis === value
                                            ? "bg-white text-slate-900 shadow-sm border border-black/5"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between gap-2 sm:justify-end md:gap-3">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                aria-label="Previous month"
                                className="rounded-full bg-slate-50/90 p-2 text-slate-500 transition-transform hover:bg-white hover:text-slate-900 hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none md:p-2.5"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="min-w-[104px] text-center md:min-w-[120px]">
                                <p className="text-[13px] font-semibold text-slate-900 md:text-[15px]">{monthFormatter.format(effectiveCurrentMonth)}</p>
                                <button
                                    type="button"
                                    onClick={jumpToToday}
                                    className="text-[10px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:text-slate-900 md:text-[12px]"
                                >
                                    Today
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                aria-label="Next month"
                                className="rounded-full bg-slate-50/90 p-2 text-slate-500 transition-transform hover:bg-white hover:text-slate-900 hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none md:p-2.5"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 md:min-w-[500px] md:gap-2 md:text-[12px] md:tracking-[0.16em]">
                        {weekdayLabels.map((label) => (
                            <div key={label} className="py-1 md:py-2">
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1 md:mt-2 md:min-w-[500px] md:gap-3">
                        {monthGridDates.map((date) => {
                            const dateKey = getLocalDateKey(date.toISOString()) ?? "";
                            const isCurrentMonth = date.getMonth() === effectiveCurrentMonth.getMonth();
                            const isSelected = dateKey === effectiveSelectedDateKey;
                            const dayTasks = groupedTasks[dateKey] || [];

                            return (
                                <button
                                    key={dateKey}
                                    type="button"
                                    onClick={() => setSelectedDateKey(dateKey)}
                                    className={cn(
                                        "min-h-11 w-full rounded-xl border border-white/70 p-1.5 text-left transition-all focus-visible:outline-none hover:scale-[1.02] active:scale-[0.98] md:min-h-[96px] md:rounded-[24px] md:p-3",
                                        isSelected
                                            ? "border-primary-dark bg-primary-dark shadow-md"
                                            : "bg-white/78 hover:bg-white",
                                        !isCurrentMonth && "opacity-45"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                                        <span className={cn("text-[12px] font-semibold md:text-[14px]", isSelected ? "text-white" : "text-slate-900")}>
                                            {date.getDate()}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className={cn("hidden rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex", isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700")}>
                                                {dayTasks.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 hidden md:block space-y-1">
                                        {dayTasks.slice(0, 2).map((task) => (
                                            <div key={task.id} className={cn("truncate text-[11px] font-medium transition-colors", isSelected ? "text-slate-300" : "text-slate-500")}>
                                                {task.title}
                                            </div>
                                        ))}
                                        {dayTasks.length > 2 && (
                                            <div className={cn("text-[11px] font-bold", isSelected ? "text-white" : "text-slate-900")}>
                                                +{dayTasks.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                    {/* Mobile Indicator */}
                                    <div className="mt-1 flex gap-0.5 md:hidden flex-wrap">
                                        {dayTasks.length > 0 ? (
                                            Array.from({ length: Math.min(dayTasks.length, 3) }).map((_, index) => (
                                                <span key={index} className={cn("h-1 w-1 rounded-full", isSelected ? "bg-white" : "bg-slate-400")} />
                                            ))
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="flex w-full shrink-0 flex-col rounded-[1.25rem] border border-white/80 bg-white/84 p-3 shadow-[0_26px_64px_-42px_rgba(15,23,42,0.28)] backdrop-blur-2xl md:p-5 lg:w-[420px] lg:rounded-[2rem] lg:p-8">
                    <div className="mb-3 flex items-start justify-between gap-3 md:mb-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 md:text-[12px]">Agenda</p>
                            <h3 className="mt-1 text-[15px] font-semibold text-slate-900 md:text-[20px]">{selectedDateLabel}</h3>
                        </div>
                        <div className="rounded-full bg-slate-50 p-2 text-slate-400 md:p-3">
                            <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                    </div>

                    {selectedDateTasks.length > 0 ? (
                        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 custom-scrollbar md:max-h-[500px] md:space-y-4 md:pr-2">
                            {selectedDateTasks.map((task) => {
                                const priority = priorityToneMap[task.priority] || priorityToneMap.MEDIUM;
                                const taskDate = getTaskCalendarDate(task, dateBasis);

                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => setSelectedTask(task)}
                                    className="flex w-full items-start gap-2 rounded-[1rem] border border-white/80 bg-white/82 p-3 text-left shadow-[0_18px_40px_-34px_rgba(15,23,42,0.34)] transition-all hover:scale-[1.02] hover:bg-white hover:shadow-[0_24px_48px_-32px_rgba(15,23,42,0.38)] active:scale-[0.98] focus-visible:outline-none md:gap-4 md:rounded-[24px] md:p-4"
                                    >
                                        <CircleDot className={cn("mt-1 h-3.5 w-3.5 shrink-0 md:mt-1.5 md:h-4 md:w-4", priority.iconClassName)} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-slate-900 md:text-[15px]">{task.title}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5 md:mt-3 md:gap-2">
                                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide md:px-3 md:py-1 md:text-[11px]", priority.badgeClassName)}>
                                                    {priority.label}
                                                </span>
                                                {taskDate && (
                                                    <span className="text-[11px] font-medium text-slate-500 md:text-[12px]">
                                                        {formatTaskDate(taskDate)}
                                                    </span>
                                                )}
                                                {task.assignee && (
                                                    <span className="hidden border-l border-slate-300 pl-2 text-[12px] font-medium text-slate-500 sm:inline">
                                                        {task.assignee.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center md:rounded-[28px] md:px-6 md:py-12">
                            <p className="text-[14px] font-semibold text-slate-900 md:text-[15px]">No events scheduled</p>
                            <p className="mt-1 text-[12px] text-slate-500 md:mt-2 md:text-[14px]">You're clear for this date.</p>
                        </div>
                    )}
                </section>
            </div>

            {activeTask && (
                <TaskDetailModal
                    task={activeTask}
                    projectColumns={columns}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updatedTask) => {
                        onUpdate?.(updatedTask);
                        setSelectedTask(updatedTask);
                    }}
                    onDelete={(taskId) => {
                        onDelete?.(taskId);
                        setSelectedTask(null);
                    }}
                />
            )}
        </>
    );
}
