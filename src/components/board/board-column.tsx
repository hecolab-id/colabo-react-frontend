"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, Column } from "@/lib/types";
import { TaskCard } from "./task-card";
import { Plus, Settings, GripVertical, MoreHorizontal } from "lucide-react";
import { ComponentPropsWithoutRef, forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualWindow } from "@/lib/hooks/use-virtual-window";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
    id: string;
    title: string;
    color?: string;
    column?: Column;
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: () => void;
    onEditColumn?: (column: Column) => void;
    dragHandleProps?: ComponentPropsWithoutRef<"div">;
    isDragging?: boolean;
    isColumnDragging?: boolean;
}

const BoardColumnBase = forwardRef<HTMLDivElement, BoardColumnProps>(({
    id,
    title,
    color = "#6366f1",
    column,
    tasks,
    onTaskClick,
    onAddTask,
    onEditColumn,
    dragHandleProps,
    isDragging = false,
    isColumnDragging = false,
}, ref) => {
    const { setNodeRef } = useDroppable({
        id,
        data: { type: "column", columnId: id },
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const shouldVirtualize = tasks.length > 24;
    const sortableItems = useMemo(() => tasks.map((task) => task.id), [tasks]);
    const virtual = useVirtualWindow<HTMLDivElement>({
        count: tasks.length,
        estimateSize: 232,
        overscan: 5,
    });
    const visibleTasks = useMemo(() => {
        if (!shouldVirtualize) {
            return tasks.map((task, index) => ({ task, index }));
        }

        return tasks
            .slice(virtual.startIndex, virtual.endIndex + 1)
            .map((task, offsetIndex) => ({ task, index: virtual.startIndex + offsetIndex }));
    }, [shouldVirtualize, tasks, virtual.endIndex, virtual.startIndex]);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isMobileMenuOpen]);

    return (
        <div
            ref={ref}
            className={cn(
                "flex h-full w-[min(17.5rem,calc(100vw-5.75rem))] shrink-0 snap-start snap-always flex-col rounded-[1.45rem] border border-slate-200/70 bg-slate-100/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_18px_46px_-40px_rgba(15,23,42,0.36)] md:w-80 md:max-w-none md:snap-center",
                isDragging && "ring-2 ring-primary/20"
            )}
        >
            {/* Header with Drag Handle */}
            <div
                className={cn(
                    "kanban-column-header group mb-2.5 flex items-center justify-between rounded-[1rem] border border-white/90 bg-white/86 px-3 py-2.5 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.32)] backdrop-blur-xl md:py-3",
                )}
                {...dragHandleProps}
            >
                <div className="flex flex-1 items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing">
                    {/* Visible Drag Handle */}
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
                    <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                    <h3 className="truncate text-sm font-semibold text-foreground">
                        {title}
                    </h3>
                    <span className="shrink-0 text-sm text-muted-foreground">
                        ({tasks.length})
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {column && onEditColumn && (
                        <div className="relative md:hidden" ref={mobileMenuRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMobileMenuOpen((prev) => !prev);
                                }}
                                aria-label={`Open ${title} column options`}
                                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color] hover:bg-slate-100 hover:text-slate-950"
                                title="Column options"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {isMobileMenuOpen && (
                                <div className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-[1rem] border border-white/80 bg-white/92 p-2 shadow-[0_22px_44px_-24px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMobileMenuOpen(false);
                                            onEditColumn(column);
                                        }}
                                        className="flex min-h-10 w-full touch-manipulation items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-slate-100"
                                    >
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        Edit Column
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Edit Column Button */}
                    {column && onEditColumn && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditColumn(column); }}
                            aria-label={`Edit ${title} column`}
                            className="hidden h-9 w-9 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,opacity] hover:bg-slate-100 hover:text-slate-950 md:flex md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                            title="Edit column"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {/* Add Task Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddTask?.(); }}
                        aria-label={`Add task to ${title}`}
                        className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-black/5 bg-white/80 text-muted-foreground transition-[background-color,color,border-color] hover:border-slate-300 hover:bg-white hover:text-slate-950 md:h-8 md:w-8"
                        title="Add task"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Cards */}
            <div
                ref={(node) => {
                    setNodeRef(node);
                    virtual.containerRef.current = node;
                }}
                className="flex-1 overflow-y-auto overscroll-y-contain rounded-[1.05rem] border border-slate-200/65 bg-[linear-gradient(180deg,rgba(248,250,252,0.78),rgba(241,245,249,0.66))] p-2 touch-pan-y shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                    {shouldVirtualize ? (
                        <div className="relative" style={{ height: virtual.totalSize }}>
                            {visibleTasks.map(({ task, index }) => (
                                <MeasuredVirtualTask
                                    key={task.id}
                                    index={index}
                                    offset={virtual.getOffset(index)}
                                    onMeasure={virtual.setSize}
                                    onClick={() => onTaskClick?.(task.id)}
                                >
                                    <TaskCard task={task} sortable={!isColumnDragging} />
                                </MeasuredVirtualTask>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {visibleTasks.map(({ task }) => (
                                <div key={task.id} className="min-w-0" onClick={() => onTaskClick?.(task.id)}>
                                    <TaskCard task={task} sortable={!isColumnDragging} />
                                </div>
                            ))}
                        </div>
                    )}
                </SortableContext>

                {tasks.length === 0 && (
                    <button
                        onClick={onAddTask}
                        className="group hidden h-24 w-full touch-manipulation items-center justify-center rounded-[1rem] border-2 border-dashed border-slate-200 bg-white/55 transition-[border-color,background-color,color] hover:border-slate-400 hover:bg-white md:flex"
                    >
                        <span className="text-sm text-slate-500 group-hover:text-slate-950">+ Add task</span>
                    </button>
                )}
            </div>
        </div>
    );
});

BoardColumnBase.displayName = "BoardColumn";

export const BoardColumn = memo(BoardColumnBase);

function MeasuredVirtualTask({
    index,
    offset,
    onMeasure,
    onClick,
    children,
}: {
    index: number;
    offset: number;
    onMeasure: (index: number, size: number) => void;
    onClick: () => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const measure = () => {
            onMeasure(index, element.offsetHeight);
        };

        measure();

        const resizeObserver = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(measure)
            : null;
        resizeObserver?.observe(element);

        return () => {
            resizeObserver?.disconnect();
        };
    }, [index, onMeasure]);

    return (
        <div
            ref={ref}
            className="absolute left-0 right-0 min-w-0 pb-3"
            style={{ transform: `translateY(${offset}px)` }}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
