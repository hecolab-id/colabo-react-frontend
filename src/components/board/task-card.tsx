"use client";

import { memo, useMemo, type CSSProperties, type HTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageCircle, Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { LabelBadge } from "@/components/ui/label-badge";
import { formatTaskDate, getDueDateTone, getPriorityTone, getStatusTone, STATUS_DOT_CLASS } from "@/lib/task-ui";

interface TaskCardProps {
    task: Task;
    sortable?: boolean;
    isBoardDragging?: boolean;
    showProjectContext?: boolean;
    showStatusBadge?: boolean;
    /**
     * When true, the card uses the frosted-glass surface (translucent + backdrop blur) appropriate
     * for cards laid over the kanban column shell. Defaults to false: opaque white, no blur, suitable
     * for cards on the page canvas (My Tasks grid, list rows). Per DESIGN.md `Frosted-When-Overlaid` rule.
     */
    elevated?: boolean;
}

type TaskCardSurfaceProps = {
    task: Task;
    isBoardDragging?: boolean;
    isDragging?: boolean;
    setNodeRef?: (element: HTMLDivElement | null) => void;
    style?: CSSProperties;
    dragProps?: HTMLAttributes<HTMLDivElement>;
    showProjectContext?: boolean;
    showStatusBadge?: boolean;
    elevated?: boolean;
};

function SortableTaskCard({ task, isBoardDragging = false, showProjectContext = false, showStatusBadge = false, elevated = false }: TaskCardProps) {
    const sortableState = useSortable({
        id: task.id,
        data: { type: "task", taskId: task.id },
        animateLayoutChanges: () => false,
    });
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = sortableState;

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isBoardDragging ? undefined : transition,
    };
    const dragProps = useMemo(() => ({ ...attributes, ...listeners }), [attributes, listeners]);

    return (
        <TaskCardSurface
            task={task}
            isBoardDragging={isBoardDragging}
            isDragging={isDragging}
            setNodeRef={setNodeRef}
            style={style}
            dragProps={dragProps}
            showProjectContext={showProjectContext}
            showStatusBadge={showStatusBadge}
            elevated={elevated}
        />
    );
}

function TaskCardSurface({
    task,
    isBoardDragging = false,
    isDragging = false,
    setNodeRef,
    style,
    dragProps,
    showProjectContext = false,
    showStatusBadge = false,
    elevated = false,
}: TaskCardSurfaceProps) {
    const priority = getPriorityTone(task.priority);
    const progress = useMemo(() => {
        // 1. If task has checklists with items, calculate from checklist completion
        if (task.checklists && task.checklists.length > 0) {
            const allItems = task.checklists
                .flatMap(checklist => checklist.items || [])
                .filter(item => item != null);

            if (allItems.length > 0) {
                const completedItems = allItems.filter(item => item.is_done).length;
                return {
                    value: Math.round((completedItems / allItems.length) * 100),
                    show: true
                };
            }
        }

        // 2. If no checklists, check if task is in a "done" column
        if (task.column?.type === 'done') {
            return { value: 100, show: true };
        }

        // 3. No checklists and not in done column = hide progress bar
        return { value: 0, show: false };
    }, [task.checklists, task.column?.type]);
    const commentCount = task.comments_count ?? task.comments?.length ?? 0;
    const assigneeFirstName = task.assignee?.name?.trim().split(/\s+/)[0] || "";

    // Due date helpers
    const dueDateTone = getDueDateTone(task.due_date);
    const isTaskDone = task.status === "DONE" || task.column?.type === "done";

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "kanban-task-card relative cursor-pointer touch-manipulation select-none overflow-hidden rounded-[1.15rem] p-3.5 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.32)] md:p-4",
                elevated
                    ? "border border-white/80 bg-white/88"
                    : "border border-black/5 bg-white",
                task.priority === "HIGH" && priority.highAccentClassName,
                dueDateTone.isOverdue && "is-overdue",
                isTaskDone && "is-complete",
                isBoardDragging
                    ? "will-change-transform transition-none shadow-none"
                    : cn(
                        "transition-[transform,border-color,box-shadow] duration-200 ease-out hover:border-slate-300 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.44)]",
                        elevated && "backdrop-blur-xl",
                    ),
                isDragging && "opacity-60 ring-2 ring-primary/15"
            )}
            {...dragProps}
        >
            {showProjectContext && task.project && (
                <div className="mb-2 flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    <span className="font-mono text-slate-400">{task.project.key}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate normal-case tracking-normal text-slate-600">{task.project.name}</span>
                </div>
            )}

            <div className="flex items-start justify-between gap-3">
                <span
                    className={cn(
                        "rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] md:px-2.5 md:py-1 md:text-[11px] md:tracking-[0.14em]",
                        task.priority === "HIGH" ? "font-bold md:shadow-[0_10px_24px_-18px_rgba(199,51,99,0.65)]" : "font-semibold",
                        priority.badgeClassName
                    )}
                >
                    {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low"}
                </span>
                {showStatusBadge && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[task.status])} />
                        {getStatusTone(task.status).label}
                    </span>
                )}
            </div>

            <h4 className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-950">
                {task.title}
            </h4>

            {task.labels && task.labels.length > 0 && (
                <div className="mb-3 flex min-w-0 items-center gap-1 overflow-hidden">
                    {task.labels.slice(0, 2).map((label) => (
                        <LabelBadge key={label.id} label={label} size="sm" className="max-w-[7.5rem] shrink truncate" />
                    ))}
                    {task.labels.length > 2 && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            +{task.labels.length - 2}
                        </span>
                    )}
                </div>
            )}

            {task.due_date && (
                <div className={cn(
                    "mb-3 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
                    dueDateTone.isOverdue && "px-3 py-1.5",
                    dueDateTone.className,
                    dueDateTone.isOverdue && isTaskDone && "is-complete-overdue-date"
                )}>
                    <Calendar className={cn("w-3 h-3", dueDateTone.isOverdue && "h-3.5 w-3.5")} />
                    <span>{formatTaskDate(task.due_date)}</span>
                    {dueDateTone.label && <span className="font-medium">{dueDateTone.label}</span>}
                </div>
            )}

            {progress.show && (
                <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{progress.value}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--progress-green-track)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                        <div
                            className={cn(
                                "h-full rounded-full transition-[width,background-color]",
                                progress.value === 100
                                    ? "bg-[image:var(--progress-green)]"
                                    : "bg-primary",
                            )}
                            style={{ width: `${progress.value}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-black/5 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                    {task.assignee && (
                        <>
                        <Avatar user={task.assignee} size="sm" ringed />
                        {assigneeFirstName ? (
                            <span className="hidden max-w-[6.5rem] truncate text-xs font-medium text-slate-600 md:block">
                                {assigneeFirstName}
                            </span>
                        ) : null}
                        </>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {commentCount}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TaskCardBase({ sortable = true, ...props }: TaskCardProps) {
    if (!sortable) {
        return <TaskCardSurface {...props} />;
    }

    return (
        <SortableTaskCard
            task={props.task}
            isBoardDragging={props.isBoardDragging}
            showProjectContext={props.showProjectContext}
            showStatusBadge={props.showStatusBadge}
            elevated={props.elevated}
        />
    );
}

export const TaskCard = memo(TaskCardBase);
