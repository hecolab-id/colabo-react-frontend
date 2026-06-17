"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "@/lib/navigation";
import { Check, ChevronDown, Flag } from "lucide-react";
import { Column, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTaskColumnId } from "@/lib/task-ui";
import { TaskDetailModal } from "./task-detail-modal";

interface TaskTimelineViewProps {
    tasks: Task[];
    columns: Column[];
    initialTaskId?: string;
    initialZoom?: ZoomLevel;
    onUpdate?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
}

type ZoomLevel = "day" | "week" | "month";
type ScheduleKind = "duration" | "deadline" | "start" | "unscheduled";

interface TaskSchedule {
    kind: ScheduleKind;
    startDay: number | null;
    endDay: number | null;
    invalid: boolean;
}

const MS_PER_DAY = 86_400_000;
const ROW_H = 44;
const GROUP_H = 38;
const BAR_H = 22;

const ZOOM_PX: Record<ZoomLevel, number> = { day: 46, week: 22, month: 7 };
const ZOOM_ORDER: ZoomLevel[] = ["day", "week", "month"];
const ZOOM_LABEL: Record<ZoomLevel, string> = { day: "Day", week: "Week", month: "Month" };

// All axis math runs in integer "epoch day" units derived from the local
// calendar date, composed through Date.UTC so a day index is stable across
// DST. Formatters read those indices back with timeZone UTC so the printed
// date matches the day the bar sits on.
function toEpochDay(value: string): number {
    const d = new Date(value);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

function todayEpochDay(): number {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

function dayToDate(day: number): Date {
    return new Date(day * MS_PER_DAY);
}

const bandMonthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const bandYearFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", timeZone: "UTC" });
const tickMonthFmt = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" });
const tickWeekFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const rangeFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const railDateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

function fmtRange(day: number): string {
    return rangeFmt.format(dayToDate(day));
}

function getSchedule(task: Task): TaskSchedule {
    const s = task.start_date ? toEpochDay(task.start_date) : null;
    const e = task.due_date ? toEpochDay(task.due_date) : null;
    if (s !== null && e !== null) {
        return { kind: "duration", startDay: Math.min(s, e), endDay: Math.max(s, e), invalid: s > e };
    }
    if (e !== null) return { kind: "deadline", startDay: null, endDay: e, invalid: false };
    if (s !== null) return { kind: "start", startDay: s, endDay: null, invalid: false };
    return { kind: "unscheduled", startDay: null, endDay: null, invalid: false };
}

type FlatRow =
    | { type: "group"; id: string; name: string; color: string; count: number; collapsed: boolean }
    | { type: "task"; task: Task; color: string; schedule: TaskSchedule; isDone: boolean; overdue: boolean };

type ScheduledRow = {
    task: Task;
    color: string;
    schedule: TaskSchedule;
    isDone: boolean;
    overdue: boolean;
    columnId: string;
};

export function TaskTimelineView({ tasks, columns, initialTaskId, initialZoom, onUpdate, onDelete }: TaskTimelineViewProps) {
    const [zoom, setZoom] = useState<ZoomLevel>(initialZoom ?? "week");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const consumedInitial = useRef(false);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const today = todayEpochDay();
    const px = ZOOM_PX[zoom];

    const sortedColumns = useMemo(
        () => [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [columns],
    );

    // Schedule + status per task, split into scheduled groups and one
    // Unscheduled section. created_at is never used as a start.
    const { groups, unscheduled, windowStart, totalDays } = useMemo(() => {
        const columnsById = new Map(columns.map((c) => [c.id, c] as const));
        const scheduled: ScheduledRow[] = [];
        const unscheduledRows: Task[] = [];

        const bounds: number[] = [today];
        for (const task of tasks) {
            const schedule = getSchedule(task);
            if (schedule.kind === "unscheduled") {
                unscheduledRows.push(task);
                continue;
            }
            const columnId = getTaskColumnId(task, columns);
            const column = columnsById.get(columnId);
            const isDone = column?.type === "done" || task.status === "DONE";
            const overdue = !isDone && schedule.endDay !== null && schedule.endDay < today;
            scheduled.push({
                task,
                color: column?.color || "#94a3b8",
                schedule,
                isDone,
                overdue,
                columnId,
            });
            if (schedule.startDay !== null) bounds.push(schedule.startDay);
            if (schedule.endDay !== null) bounds.push(schedule.endDay);
        }

        const minDay = Math.min(...bounds);
        const maxDay = Math.max(...bounds);
        // Snap the window to whole months so the month band reads cleanly.
        const minD = dayToDate(minDay);
        const maxD = dayToDate(maxDay);
        const startSnap = Math.floor(Date.UTC(minD.getUTCFullYear(), minD.getUTCMonth(), 1) / MS_PER_DAY);
        const endSnap = Math.floor(Date.UTC(maxD.getUTCFullYear(), maxD.getUTCMonth() + 1, 0) / MS_PER_DAY);
        const days = endSnap - startSnap + 1;

        const sortRows = (a: { schedule: TaskSchedule; task: Task }, b: { schedule: TaskSchedule; task: Task }) => {
            const av = a.schedule.startDay ?? a.schedule.endDay ?? Number.MAX_SAFE_INTEGER;
            const bv = b.schedule.startDay ?? b.schedule.endDay ?? Number.MAX_SAFE_INTEGER;
            if (av !== bv) return av - bv;
            return a.task.title.localeCompare(b.task.title);
        };

        const built = sortedColumns
            .map((col) => ({
                id: col.id,
                name: col.name,
                color: col.color || "#94a3b8",
                tasks: scheduled.filter((row) => row.columnId === col.id).sort(sortRows),
            }))
            .filter((group) => group.tasks.length > 0);

        const groupedIds = new Set(built.flatMap((group) => group.tasks.map((row) => row.task.id)));
        const orphans = scheduled.filter((row) => !groupedIds.has(row.task.id)).sort(sortRows);
        if (orphans.length > 0) {
            built.push({ id: "__ungrouped", name: "Other", color: "#94a3b8", tasks: orphans });
        }

        return { groups: built, unscheduled: unscheduledRows, windowStart: startSnap, totalDays: days };
    }, [columns, sortedColumns, tasks, today]);

    const totalWidth = totalDays * px;
    const todayLeft = (today - windowStart) * px + px / 2;
    const dayLeft = (day: number) => (day - windowStart) * px;

    // Axis ticks, bands, gridlines and weekend shading, derived in one pass.
    const { bands, ticks, gridLines, weekends } = useMemo(() => {
        const tickStarts: number[] = [];
        const bandStarts: number[] = [];
        const lines: Array<{ left: number; strong: boolean }> = [];
        const weekendRects: Array<{ left: number; width: number }> = [];

        for (let i = 0; i < totalDays; i++) {
            const d = dayToDate(windowStart + i);
            const dow = d.getUTCDay();
            const dom = d.getUTCDate();
            const month = d.getUTCMonth();

            if (zoom === "day") {
                lines.push({ left: i * px, strong: dow === 0 });
                if (dow === 0 || dow === 6) weekendRects.push({ left: i * px, width: px });
                tickStarts.push(i);
            } else if (zoom === "week") {
                if (i === 0 || dow === 0) {
                    lines.push({ left: i * px, strong: false });
                    tickStarts.push(i);
                }
            } else {
                if (i === 0 || dom === 1) {
                    lines.push({ left: i * px, strong: false });
                    tickStarts.push(i);
                }
            }

            const isBandBoundary = zoom === "month" ? month === 0 && dom === 1 : dom === 1;
            if (i === 0 || isBandBoundary) bandStarts.push(i);
        }

        const tickList = tickStarts.map((start, k) => {
            const end = tickStarts[k + 1] ?? totalDays;
            const d = dayToDate(windowStart + start);
            const label =
                zoom === "day"
                    ? String(d.getUTCDate())
                    : zoom === "week"
                        ? tickWeekFmt.format(d)
                        : tickMonthFmt.format(d);
            const weekend = zoom === "day" && (d.getUTCDay() === 0 || d.getUTCDay() === 6);
            return { left: start * px, width: (end - start) * px, label, weekend };
        });

        const bandList = bandStarts.map((start, k) => {
            const end = bandStarts[k + 1] ?? totalDays;
            const d = dayToDate(windowStart + start);
            return {
                left: start * px,
                width: (end - start) * px,
                label: zoom === "month" ? bandYearFmt.format(d) : bandMonthFmt.format(d),
            };
        });

        return { bands: bandList, ticks: tickList, gridLines: lines, weekends: weekendRects };
    }, [px, totalDays, windowStart, zoom]);

    const flatRows = useMemo(() => {
        const rows: FlatRow[] = [];
        for (const group of groups) {
            const isCollapsed = !!collapsed[group.id];
            rows.push({ type: "group", id: group.id, name: group.name, color: group.color, count: group.tasks.length, collapsed: isCollapsed });
            if (!isCollapsed) {
                for (const row of group.tasks) {
                    rows.push({ type: "task", task: row.task, color: row.color, schedule: row.schedule, isDone: row.isDone, overdue: row.overdue });
                }
            }
        }
        if (unscheduled.length > 0) {
            const isCollapsed = !!collapsed.__unscheduled;
            rows.push({ type: "group", id: "__unscheduled", name: "Unscheduled", color: "#cbd5e1", count: unscheduled.length, collapsed: isCollapsed });
            if (!isCollapsed) {
                for (const task of unscheduled) {
                    rows.push({ type: "task", task, color: "#cbd5e1", schedule: getSchedule(task), isDone: false, overdue: false });
                }
            }
        }
        return rows;
    }, [collapsed, groups, unscheduled]);

    const hasTasks = tasks.length > 0;
    const hasScheduled = groups.length > 0;

    // Open the deep-linked task once, then strip ?taskId from the URL.
    useEffect(() => {
        if (consumedInitial.current || !initialTaskId) return;
        const match = tasks.find((task) => task.id === initialTaskId);
        if (!match) return;
        consumedInitial.current = true;
        setSelectedTask(match);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("taskId");
        const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [initialTaskId, pathname, router, searchParams, tasks]);

    // Keep today roughly a third from the left whenever the scale changes.
    useEffect(() => {
        const node = scrollRef.current;
        if (!node || !hasScheduled) return;
        node.scrollLeft = Math.max(0, todayLeft - node.clientWidth * 0.3);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom, hasScheduled]);

    const recenterToday = () => {
        const node = scrollRef.current;
        if (!node) return;
        node.scrollTo({ left: Math.max(0, todayLeft - node.clientWidth * 0.3), behavior: "smooth" });
    };

    const toggleGroup = (id: string) =>
        setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

    if (!hasTasks) {
        return (
            <div className="flex h-full flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
                <p className="text-[15px] font-semibold text-slate-900">No tasks to schedule yet</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Create a task and give it a start or due date to see it laid out on the timeline.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar: legend on the left, scale + recenter on the right */}
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Legend />
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={recenterToday}
                        className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        Today
                    </button>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 p-0.5">
                        {ZOOM_ORDER.map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setZoom(level)}
                                aria-pressed={zoom === level}
                                className={cn(
                                    "min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    zoom === level
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800",
                                )}
                            >
                                {ZOOM_LABEL[level]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="relative min-h-0 flex-1 overflow-auto rounded-[1.1rem] border border-slate-200/80 bg-white"
            >
                <div className="relative w-max min-w-full">
                    {/* Header: month/year band + tick row */}
                    <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white/95 backdrop-blur">
                        <div className="sticky left-0 z-40 flex w-[148px] shrink-0 items-end border-r border-slate-200 bg-white px-3 pb-1.5 sm:w-[252px]">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Task</span>
                        </div>
                        <div className="relative shrink-0" style={{ width: totalWidth, height: 52 }}>
                            {bands.map((band, index) => (
                                <div
                                    key={`band-${index}`}
                                    className="absolute top-0 flex h-[26px] items-center border-r border-slate-100 px-2 text-[11px] font-semibold text-slate-500"
                                    style={{ left: band.left, width: band.width }}
                                >
                                    <span className="sticky left-2 truncate">{band.label}</span>
                                </div>
                            ))}
                            {ticks.map((tick, index) => (
                                <div
                                    key={`tick-${index}`}
                                    className={cn(
                                        "absolute top-[26px] flex h-[26px] items-center justify-center border-r border-slate-100 text-[11px] tabular-nums",
                                        tick.weekend ? "text-slate-300" : "text-slate-500",
                                    )}
                                    style={{ left: tick.left, width: tick.width }}
                                >
                                    <span className="truncate px-1">{tick.label}</span>
                                </div>
                            ))}
                            {todayLeft >= 0 && todayLeft <= totalWidth ? (
                                <div
                                    className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground"
                                    style={{ left: todayLeft }}
                                >
                                    Today
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Body: rail column + canvas column, aligned row for row */}
                    <div className="relative flex">
                        {/* Rail */}
                        <div className="sticky left-0 z-20 w-[148px] shrink-0 border-r border-slate-200 bg-white sm:w-[252px]">
                            {flatRows.map((row, index) =>
                                row.type === "group" ? (
                                    <button
                                        key={`rail-g-${row.id}`}
                                        type="button"
                                        onClick={() => toggleGroup(row.id)}
                                        className="flex w-full items-center gap-1.5 border-b border-slate-100 bg-slate-50/70 px-2 text-left transition-colors hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-3"
                                        style={{ height: GROUP_H }}
                                        aria-expanded={!row.collapsed}
                                    >
                                        <ChevronDown
                                            className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", row.collapsed && "-rotate-90")}
                                            aria-hidden="true"
                                        />
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: row.color }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate text-[12px] font-semibold uppercase tracking-wide text-slate-600">{row.name}</span>
                                        <span className="ml-auto shrink-0 text-[11px] font-medium tabular-nums text-slate-400">{row.count}</span>
                                    </button>
                                ) : (
                                    <button
                                        key={`rail-t-${row.task.id}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedTask(row.task)}
                                        onMouseEnter={() => setHoveredId(row.task.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        className={cn(
                                            "flex w-full items-center gap-2 border-b border-slate-100 px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-3",
                                            hoveredId === row.task.id ? "bg-slate-50" : "bg-white",
                                        )}
                                        style={{ height: ROW_H }}
                                    >
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: row.color }}
                                            aria-hidden="true"
                                        />
                                        <span className={cn("min-w-0 flex-1 truncate text-[13px]", row.isDone ? "text-slate-400 line-through" : "text-slate-800")}>
                                            {row.task.title}
                                        </span>
                                        <span className="hidden shrink-0 text-[11px] tabular-nums text-slate-400 sm:block">
                                            {railHint(row.schedule)}
                                        </span>
                                    </button>
                                ),
                            )}
                        </div>

                        {/* Canvas */}
                        <div className="relative shrink-0" style={{ width: totalWidth }}>
                            {/* Background: weekend shading, gridlines, today line */}
                            <div className="pointer-events-none absolute inset-0 z-0">
                                {weekends.map((rect, index) => (
                                    <div key={`wk-${index}`} className="absolute inset-y-0 bg-slate-50" style={{ left: rect.left, width: rect.width }} />
                                ))}
                                {gridLines.map((line, index) => (
                                    <div
                                        key={`gl-${index}`}
                                        className={cn("absolute inset-y-0 w-px", line.strong ? "bg-slate-200" : "bg-slate-100")}
                                        style={{ left: line.left }}
                                    />
                                ))}
                                {todayLeft >= 0 && todayLeft <= totalWidth ? (
                                    <div className="absolute inset-y-0 w-px bg-primary/60" style={{ left: todayLeft }} />
                                ) : null}
                            </div>

                            {/* Rows */}
                            <div className="relative z-10">
                                {flatRows.map((row, index) =>
                                    row.type === "group" ? (
                                        <div
                                            key={`cv-g-${row.id}`}
                                            className="border-b border-slate-100 bg-slate-50/40"
                                            style={{ height: GROUP_H }}
                                        />
                                    ) : (
                                        <div
                                            key={`cv-t-${row.task.id}-${index}`}
                                            onMouseEnter={() => setHoveredId(row.task.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            className={cn(
                                                "relative border-b border-slate-100 transition-colors",
                                                hoveredId === row.task.id && "bg-slate-500/[0.03]",
                                            )}
                                            style={{ height: ROW_H }}
                                        >
                                            <TimelineBar
                                                schedule={row.schedule}
                                                isDone={row.isDone}
                                                overdue={row.overdue}
                                                title={row.task.title}
                                                px={px}
                                                dayLeft={dayLeft}
                                                onOpen={() => setSelectedTask(row.task)}
                                            />
                                        </div>
                                    ),
                                )}
                            </div>

                            {!hasScheduled ? (
                                <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center px-6">
                                    <p className="max-w-xs text-center text-sm text-slate-400">
                                        No scheduled tasks yet. Add a start or due date to place a task on the timeline.
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTask ? (
                <TaskDetailModal
                    task={selectedTask}
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
            ) : null}
        </div>
    );
}

function railHint(schedule: TaskSchedule): string {
    if (schedule.kind === "duration" && schedule.startDay !== null && schedule.endDay !== null) {
        return `${railDateFmt.format(dayToDate(schedule.startDay))} – ${railDateFmt.format(dayToDate(schedule.endDay))}`;
    }
    if (schedule.kind === "deadline" && schedule.endDay !== null) {
        return `Due ${railDateFmt.format(dayToDate(schedule.endDay))}`;
    }
    if (schedule.kind === "start" && schedule.startDay !== null) {
        return `From ${railDateFmt.format(dayToDate(schedule.startDay))}`;
    }
    return "No dates";
}

function TimelineBar({
    schedule,
    isDone,
    overdue,
    title,
    px,
    dayLeft,
    onOpen,
}: {
    schedule: TaskSchedule;
    isDone: boolean;
    overdue: boolean;
    title: string;
    px: number;
    dayLeft: (day: number) => number;
    onOpen: () => void;
}) {
    const top = (ROW_H - BAR_H) / 2;

    if (schedule.kind === "deadline" && schedule.endDay !== null) {
        const center = dayLeft(schedule.endDay) + px / 2;
        const label = `${title} · Due ${fmtRange(schedule.endDay)}`;
        return (
            <button
                type="button"
                onClick={onOpen}
                title={label}
                aria-label={label}
                className="group absolute flex -translate-x-1/2 items-center justify-center focus-visible:outline-none"
                style={{ left: center, top, height: BAR_H }}
            >
                <span
                    className={cn(
                        "block h-3 w-3 rotate-45 rounded-[2px] border transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-primary/50",
                        overdue
                            ? "border-rose-400 bg-rose-300"
                            : isDone
                                ? "border-slate-300 bg-slate-200"
                                : "border-slate-400 bg-slate-300",
                    )}
                    aria-hidden="true"
                />
            </button>
        );
    }

    if (schedule.kind === "start" && schedule.startDay !== null) {
        const left = dayLeft(schedule.startDay);
        const width = Math.max(px, 24);
        const label = `${title} · Starts ${fmtRange(schedule.startDay)}`;
        return (
            <button
                type="button"
                onClick={onOpen}
                title={label}
                aria-label={label}
                className="group absolute flex items-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-100 pl-1 transition-colors hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{ left, width, top, height: BAR_H }}
            >
                <Flag className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
            </button>
        );
    }

    if (schedule.kind === "duration" && schedule.startDay !== null && schedule.endDay !== null) {
        const left = dayLeft(schedule.startDay);
        const width = Math.max(8, (schedule.endDay - schedule.startDay + 1) * px) - 2;
        const label = `${title} · ${fmtRange(schedule.startDay)} – ${fmtRange(schedule.endDay)}${schedule.invalid ? " (start is after due date)" : ""}`;
        // Below ~56px the label is unreadable and clips to a stray glyph, so
        // drop it; the rail already carries the title. Keep the done check
        // only when the bar is wide enough to hold it cleanly.
        const showLabel = width >= 56;
        const showCheck = isDone && width >= 28;
        return (
            <button
                type="button"
                onClick={onOpen}
                title={label}
                aria-label={label}
                className={cn(
                    "group absolute flex items-center gap-1 overflow-hidden rounded-md border text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    showLabel || showCheck ? "px-2" : "px-0",
                    overdue
                        ? "border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200/80"
                        : isDone
                            ? "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200/70"
                            : "border-slate-300/80 bg-slate-200 text-slate-600 hover:bg-slate-300/80",
                    schedule.invalid && "border-amber-300 ring-1 ring-amber-200",
                )}
                style={{ left: left + 1, width, top, height: BAR_H }}
            >
                {showCheck ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
                {showLabel ? <span className="truncate">{title}</span> : null}
            </button>
        );
    }

    return null;
}

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-[3px] border border-slate-300/80 bg-slate-200" aria-hidden="true" />
                Duration
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] border border-slate-400 bg-slate-300" aria-hidden="true" />
                Deadline
            </span>
            <span className="inline-flex items-center gap-1.5">
                <Flag className="h-3 w-3 text-slate-500" aria-hidden="true" />
                Start only
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] border border-rose-400 bg-rose-300" aria-hidden="true" />
                Overdue
            </span>
        </div>
    );
}
