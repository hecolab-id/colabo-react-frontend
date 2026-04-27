"use client";

import { memo, useMemo, type CSSProperties, type HTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "@/components/app-image";
import { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageCircle, Calendar } from "lucide-react";
import { LabelBadge } from "@/components/ui/label-badge";
import { formatTaskDate, getDueDateTone, getPriorityTone } from "@/lib/task-ui";

interface TaskCardProps {
    task: Task;
    sortable?: boolean;
    isBoardDragging?: boolean;
}

type TaskCardSurfaceProps = {
    task: Task;
    isBoardDragging?: boolean;
    isDragging?: boolean;
    setNodeRef?: (element: HTMLDivElement | null) => void;
    style?: CSSProperties;
    dragProps?: HTMLAttributes<HTMLDivElement>;
};

function SortableTaskCard({ task, isBoardDragging = false }: TaskCardProps) {
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

    // Due date helpers
    const dueDateTone = getDueDateTone(task.due_date);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "cursor-pointer touch-manipulation select-none rounded-[1.15rem] border border-white/80 bg-white/88 p-3.5 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.32)] md:p-4",
                isBoardDragging
                    ? "will-change-transform transition-none shadow-none"
                    : "backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_-28px_rgba(15,23,42,0.38)]",
                isDragging && "opacity-60 ring-2 ring-primary/15"
            )}
            {...dragProps}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", priority.badgeClassName)}>
                    {task.priority === "MEDIUM" ? "Medium" : priority.label}
                </span>
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
                    dueDateTone.className
                )}>
                    <Calendar className="w-3 h-3" />
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
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={cn(
                                "h-full rounded-full transition-[width,background-image]",
                                progress.value === 100 ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-orange-400 to-orange-500"
                            )}
                            style={{ width: `${progress.value}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-black/5 pt-3">
                <div className="flex -space-x-2">
                    {task.assignee && (
                        <div className="h-7 w-7 overflow-hidden rounded-full border-2 border-white">
                            <Image
                                src={task.assignee.avatar_url || "https://ui-avatars.com/api/?background=afb2f6&name=" + encodeURIComponent(task.assignee.name)}
                                alt={task.assignee.name}
                                width={28}
                                height={28}
                                className="w-full h-full object-cover"
                            />
                        </div>
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

    return <SortableTaskCard {...props} />;
}

export const TaskCard = memo(TaskCardBase);
