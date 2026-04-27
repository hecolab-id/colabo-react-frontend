"use client";

import Image from "@/components/app-image";
import { usePathname, useRouter, useSearchParams } from "@/lib/navigation";
import { Task, Column } from "@/lib/types";
import { TaskDetailModal } from "./task-detail-modal";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabelBadge } from "@/components/ui/label-badge";
import { priorityToneMap } from "@/lib/task-ui";
import { useVirtualWindow } from "@/lib/hooks/use-virtual-window";

interface TaskListViewProps {
    tasks: Task[];
    columns: Column[];
    initialTaskId?: string;
    onUpdate?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
}

type ListRow =
    | { type: "header"; id: string; column: Column; count: number; collapsed: boolean }
    | { type: "empty"; id: string; column: Column }
    | { type: "task"; id: string; column: Column; task: Task };

const priorityConfig = {
    HIGH: { label: "High", icon: AlertCircle },
    MEDIUM: { label: "Medium", icon: Clock },
    LOW: { label: "Low", icon: Circle },
};

const STATUS_TO_COLUMN_NAME: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
    BACKLOG: "Backlog",
};

export function TaskListView({ tasks, columns, initialTaskId, onUpdate, onDelete }: TaskListViewProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialTask = useMemo(
        () => (initialTaskId ? tasks.find((item) => item.id === initialTaskId) ?? null : null),
        [initialTaskId, tasks],
    );
    const activeTask = selectedTask ?? initialTask;

    useEffect(() => {
        if (!initialTask) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("taskId");
        const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [initialTask, pathname, router, searchParams]);

    const toggleColumn = (columnId: string) => {
        setCollapsedColumns((prev) => {
            const next = new Set(prev);
            if (next.has(columnId)) {
                next.delete(columnId);
            } else {
                next.add(columnId);
            }
            return next;
        });
    };

    const getTaskColumnId = (task: Task): string => {
        if (task.column_id) return task.column_id;
        const columnName = STATUS_TO_COLUMN_NAME[task.status] || "To Do";
        const column = columns.find((item) => item.name === columnName);
        return column?.id || columns[0]?.id || "";
    };

    const rows = useMemo<ListRow[]>(() => {
        const groupedTasks = tasks.reduce((acc, task) => {
            const columnId = getTaskColumnId(task);
            if (!acc[columnId]) acc[columnId] = [];
            acc[columnId].push(task);
            return acc;
        }, {} as Record<string, Task[]>);

        return [...columns]
            .sort((left, right) => left.order - right.order)
            .flatMap((column) => {
                const columnTasks = groupedTasks[column.id] || [];
                const collapsed = collapsedColumns.has(column.id);
                const header: ListRow = {
                    type: "header",
                    id: `header-${column.id}`,
                    column,
                    count: columnTasks.length,
                    collapsed,
                };

                if (collapsed) {
                    return [header];
                }

                if (columnTasks.length === 0) {
                    return [header, { type: "empty", id: `empty-${column.id}`, column }];
                }

                return [
                    header,
                    ...columnTasks.map((task): ListRow => ({
                        type: "task",
                        id: task.id,
                        column,
                        task,
                    })),
                ];
            });
    }, [collapsedColumns, columns, tasks]);

    const virtual = useVirtualWindow<HTMLDivElement>({
        count: rows.length,
        estimateSize: (index) => {
            const row = rows[index];
            if (!row) return 72;
            if (row.type === "header") return 56;
            if (row.type === "empty") return 76;
            return 112;
        },
        overscan: 8,
    });
    const visibleRows = rows.slice(virtual.startIndex, virtual.endIndex + 1);

    return (
        <>
            <div ref={virtual.containerRef} className="h-full overflow-y-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {tasks.length === 0 ? (
                    <div className="rounded-[1.8rem] border border-white/80 bg-white/82 py-16 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
                        <p className="text-lg font-semibold text-slate-950">No tasks yet</p>
                        <p className="mt-2 text-sm text-slate-500">Create your first task to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="sticky top-0 z-10 hidden gap-4 rounded-[1.3rem] border border-white/80 bg-white/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.24)] backdrop-blur-2xl md:grid md:grid-cols-12">
                            <div className="col-span-5">Task</div>
                            <div className="col-span-2">Column</div>
                            <div className="col-span-2">Priority</div>
                            <div className="col-span-2">Assignee</div>
                            <div className="col-span-1" />
                        </div>

                        <div className="relative" style={{ height: virtual.totalSize }}>
                            {visibleRows.map((row, offsetIndex) => (
                                <div
                                    key={row.id}
                                    className="absolute left-0 right-0"
                                    style={{ transform: `translateY(${virtual.getOffset(virtual.startIndex + offsetIndex)}px)` }}
                                >
                                    {row.type === "header" ? (
                                        <button
                                            onClick={() => toggleColumn(row.column.id)}
                                            className="flex w-full touch-manipulation items-center gap-3 rounded-[1.4rem] border border-white/80 bg-white/84 px-4 py-3 text-left shadow-[0_22px_48px_-36px_rgba(15,23,42,0.35)] backdrop-blur-2xl transition-colors hover:bg-white"
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                    row.collapsed && "-rotate-90",
                                                )}
                                            />
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.column.color }} />
                                            <span className="text-sm font-medium text-foreground">{row.column.name}</span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{row.count}</span>
                                        </button>
                                    ) : row.type === "empty" ? (
                                        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/58 px-4 py-6 text-center text-sm italic text-muted-foreground">
                                            No tasks in this column
                                        </div>
                                    ) : (
                                        <TaskListRow
                                            task={row.task}
                                            column={row.column}
                                            onClick={() => setSelectedTask(row.task)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

function TaskListRow({ task, column, onClick }: { task: Task; column: Column; onClick: () => void }) {
    const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
    const tone = priorityToneMap[task.priority] || priorityToneMap.MEDIUM;
    const PriorityIcon = priority.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group grid w-full cursor-pointer grid-cols-1 gap-3 rounded-[1.25rem] border border-white/80 bg-white/84 px-4 py-4 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-colors hover:bg-slate-50/90 md:grid-cols-12 md:gap-4 md:py-3"
        >
            <div className="min-w-0 md:col-span-5">
                <span className="block min-w-0 truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-primary md:text-base">
                    {task.title}
                </span>
                <div className="mb-3 mt-2 flex items-center gap-2 md:hidden">
                    <span
                        className="max-w-full truncate rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground"
                        style={{ backgroundColor: `${column.color}22` }}
                    >
                        {column.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone.badgeClassName}`}>
                        <PriorityIcon className={`h-3.5 w-3.5 ${tone.iconClassName}`} />
                        {priority.label}
                    </span>
                </div>
                {task.labels && task.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {task.labels.slice(0, 3).map((label) => (
                            <LabelBadge key={label.id} label={label} size="sm" />
                        ))}
                        {task.labels.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                +{task.labels.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="hidden items-center md:col-span-2 md:flex">
                <span
                    className="rounded-full border border-border/60 px-2 py-0.5 text-xs font-medium text-foreground"
                    style={{ backgroundColor: `${column.color}22` }}
                >
                    {column.name}
                </span>
            </div>

            <div className="hidden items-center gap-1.5 md:col-span-2 md:flex">
                <PriorityIcon className={`h-4 w-4 ${tone.iconClassName}`} />
                <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${tone.badgeClassName}`}>{priority.label}</span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3 md:col-span-2 md:justify-start md:border-t-0 md:pt-0">
                {task.assignee ? (
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                            {task.assignee.avatar_url ? (
                                <Image
                                    src={task.assignee.avatar_url}
                                    alt={task.assignee.name}
                                    width={28}
                                    height={28}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-xs font-medium text-primary">{task.assignee.name.charAt(0)}</span>
                            )}
                        </div>
                        <span className="min-w-0 truncate text-sm text-muted-foreground">{task.assignee.name}</span>
                    </div>
                ) : (
                    <span className="text-sm italic text-muted-foreground">Unassigned</span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:hidden" />
            </div>

            <div className="hidden items-center justify-end md:col-span-1 md:flex">
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
        </button>
    );
}
