"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "@/lib/navigation";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    AutoScrollActivator,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { customCollisionDetection } from "@/lib/dnd-utils";
import { arrayMove, sortableKeyboardCoordinates, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskLite, Column } from "@/lib/types";
import { SortableColumn } from "./sortable-column";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";
import { Plus, GripVertical } from "lucide-react";

interface KanbanBoardProps {
    initialTasks: TaskLite[];
    columns: Column[];
    initialTaskId?: string;
    onAddTask?: (columnId: string) => void;
    onTaskMove?: (taskId: string, columnId: string, newPosition: number) => void;
    onTaskDelete?: (taskId: string) => void | Promise<unknown>;
    onAddColumn?: () => void;
    onEditColumn?: (column: Column) => void;
    onColumnReorder?: (columnIds: string[]) => void;
}

// Legacy mapping for backward compatibility (status -> column mapping)
const STATUS_TO_COLUMN_NAME: Record<string, string> = {
    "TODO": "To Do",
    "IN_PROGRESS": "In Progress",
    "DONE": "Done",
    "BACKLOG": "Backlog",
};

function getStatusFromColumn(column: Column | undefined): TaskLite["status"] {
    if (!column) return "TODO";
    if (column.type === "done") return "DONE";
    if (column.type === "in_progress") return "IN_PROGRESS";

    const normalizedName = column.name.trim().toUpperCase().replace(/\s+/g, "_");
    if (normalizedName === "IN_PROGRESS" || normalizedName === "DONE" || normalizedName === "BACKLOG" || normalizedName === "TODO") {
        return normalizedName;
    }

    return "TODO";
}

function applyTaskColumnChange(tasks: TaskLite[], taskId: string, columnId: string, columns: Column[]): TaskLite[] {
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
        return tasks;
    }

    const targetColumn = columns.find((column) => column.id === columnId);
    const nextTasks = [...tasks];
    nextTasks[taskIndex] = {
        ...nextTasks[taskIndex],
        column_id: columnId,
        status: getStatusFromColumn(targetColumn),
        column: targetColumn,
    };

    return nextTasks;
}

function sortColumnsByOrder(columns: Column[]): Column[] {
    return [...columns].sort((a, b) => a.order - b.order);
}

function applyColumnOrder(columns: Column[]): Column[] {
    return columns.map((column, index) => ({ ...column, order: index }));
}

type TaskLookup = {
    taskById: Map<string, TaskLite>;
    indexById: Map<string, number>;
    columnIdByTaskId: Map<string, string>;
};

function createTaskLookup(tasks: TaskLite[], getTaskColumnId: (task: TaskLite) => string): TaskLookup {
    const taskById = new Map<string, TaskLite>();
    const indexById = new Map<string, number>();
    const columnIdByTaskId = new Map<string, string>();

    tasks.forEach((task, index) => {
        taskById.set(task.id, task);
        indexById.set(task.id, index);
        columnIdByTaskId.set(task.id, getTaskColumnId(task));
    });

    return { taskById, indexById, columnIdByTaskId };
}

export function KanbanBoard({ initialTasks, columns, initialTaskId, onAddTask, onTaskMove, onTaskDelete, onAddColumn, onEditColumn, onColumnReorder }: KanbanBoardProps) {
    const [tasks, setTasks] = useState<TaskLite[]>(initialTasks);
    const [activeTask, setActiveTask] = useState<TaskLite | null>(null);
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeColumnTasks, setActiveColumnTasks] = useState<TaskLite[]>([]);
    const [localColumns, setLocalColumns] = useState<Column[]>(columns);
    const [hasMounted, setHasMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const previousInitialTasksRef = useRef(initialTasks);
    const lastDragOverKeyRef = useRef<string | null>(null);
    const dragOverFrameRef = useRef<number | null>(null);
    const pendingDragOverRef = useRef<{ activeId: string; overId: string } | null>(null);

    // Sync tasks only when the incoming task contents actually change.
    // This prevents parent re-renders from snapping an optimistic drag
    // back to stale props before the mutation cache catches up.
    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (previousInitialTasksRef.current === initialTasks) {
            return;
        }

        previousInitialTasksRef.current = initialTasks;
        setTasks(initialTasks);
    }, [initialTasks]);

    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 180,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Helper: get column ID for a task (prefer column_id, fallback to status mapping)
    const getTaskColumnId = useCallback((task: TaskLite): string => {
        if (task.column_id) return task.column_id;
        // Legacy fallback: find column by status name mapping
        const columnName = STATUS_TO_COLUMN_NAME[task.status] || "To Do";
        const column = localColumns.find(c => c.name === columnName);
        return column?.id || localColumns[0]?.id || "";
    }, [localColumns]);

    const columnsById = useMemo(() => {
        return new Map(localColumns.map((column) => [column.id, column]));
    }, [localColumns]);

    const sortedColumns = useMemo(() => sortColumnsByOrder(localColumns), [localColumns]);
    const sortedColumnIds = useMemo(() => sortedColumns.map((column) => `column-${column.id}`), [sortedColumns]);
    const addTaskHandlersByColumnId = useMemo(() => {
        const handlers = new Map<string, () => void>();
        if (!onAddTask) {
            return handlers;
        }

        localColumns.forEach((column) => {
            handlers.set(column.id, () => onAddTask(column.id));
        });

        return handlers;
    }, [localColumns, onAddTask]);

    const tasksByColumnId = useMemo(() => {
        const grouped = new Map<string, TaskLite[]>();
        localColumns.forEach((column) => grouped.set(column.id, []));

        tasks.forEach((task) => {
            const columnId = getTaskColumnId(task);
            const columnTasks = grouped.get(columnId);
            if (columnTasks) {
                columnTasks.push(task);
            } else {
                grouped.set(columnId, [task]);
            }
        });

        return grouped;
    }, [getTaskColumnId, localColumns, tasks]);
    const taskLookup = useMemo(() => createTaskLookup(tasks, getTaskColumnId), [getTaskColumnId, tasks]);
    const tasksRef = useRef(tasks);
    const localColumnsRef = useRef(localColumns);
    const columnsByIdRef = useRef(columnsById);
    const taskLookupRef = useRef(taskLookup);

    useEffect(() => {
        tasksRef.current = tasks;
        localColumnsRef.current = localColumns;
        columnsByIdRef.current = columnsById;
        taskLookupRef.current = taskLookup;
    }, [columnsById, localColumns, taskLookup, tasks]);

    useEffect(() => {
        return () => {
            if (dragOverFrameRef.current !== null) {
                cancelAnimationFrame(dragOverFrameRef.current);
            }
        };
    }, []);
    const isTaskDragging = Boolean(activeTask);
    const isColumnDragging = Boolean(activeColumn);
    const isBoardDragging = isTaskDragging || isColumnDragging;
    const autoScrollOptions = useMemo(() => ({
        activator: AutoScrollActivator.Pointer,
        acceleration: isTaskDragging ? 1.45 : 6,
        interval: isTaskDragging ? 18 : 10,
        threshold: {
            x: isTaskDragging ? 0.08 : 0.2,
            y: isTaskDragging ? 0.14 : 0.18,
        },
    }), [isTaskDragging]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const activeId = String(active.id);
        lastDragOverKeyRef.current = null;
        pendingDragOverRef.current = null;

        // Check if dragging a column
        if (activeId.startsWith("column-")) {
            const columnId = activeId.replace("column-", "");
            const column = columnsByIdRef.current.get(columnId);
            if (column) {
                setActiveColumn(column);
                // Also capture the tasks in this column for the overlay
                setActiveColumnTasks(tasksByColumnId.get(columnId) || []);
                setActiveTask(null);
            }
        } else {
            // Dragging a task
            const task = taskLookupRef.current.taskById.get(activeId);
            if (task) {
                setActiveTask(task);
                setActiveColumn(null);
                setActiveColumnTasks([]);
            }
        }
    }, [getTaskColumnId, tasksByColumnId]);

    const applyPendingDragOver = useCallback(() => {
        dragOverFrameRef.current = null;
        const pendingDragOver = pendingDragOverRef.current;
        pendingDragOverRef.current = null;

        if (!pendingDragOver) {
            return;
        }

        const { activeId, overId } = pendingDragOver;
        const currentLookup = taskLookupRef.current;
        const currentColumns = localColumnsRef.current;
        const activeTaskIndex = currentLookup.indexById.get(activeId) ?? -1;
        const overTaskIndex = currentLookup.indexById.get(overId) ?? -1;

        if (columnsByIdRef.current.has(overId) && activeTaskIndex !== -1) {
            const currentColumnId = currentLookup.columnIdByTaskId.get(activeId);

            if (currentColumnId !== overId) {
                setTasks((prev) => applyTaskColumnChange(prev, activeId, overId, currentColumns));
            }
            return;
        }

        if (activeTaskIndex !== -1 && overTaskIndex !== -1 && activeId !== overId) {
            const activeColumnId = currentLookup.columnIdByTaskId.get(activeId);
            const overColumnId = currentLookup.columnIdByTaskId.get(overId);

            if (!overColumnId) {
                return;
            }

            if (activeColumnId !== overColumnId) {
                setTasks((prev) => {
                    const currentActiveIndex = prev.findIndex((task) => task.id === activeId);
                    const currentOverIndex = prev.findIndex((task) => task.id === overId);

                    if (currentActiveIndex === -1 || currentOverIndex === -1) {
                        return prev;
                    }

                    const nextTasks = applyTaskColumnChange(prev, activeId, overColumnId, currentColumns);
                    return arrayMove(nextTasks, currentActiveIndex, currentOverIndex);
                });
            }
        }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || activeColumn) return; // Skip for column dragging

        const activeId = String(active.id);
        const overId = String(over.id);
        const dragOverKey = `${activeId}:${overId}`;
        if (lastDragOverKeyRef.current === dragOverKey) {
            return;
        }
        lastDragOverKeyRef.current = dragOverKey;

        pendingDragOverRef.current = { activeId, overId };
        if (dragOverFrameRef.current === null) {
            dragOverFrameRef.current = requestAnimationFrame(applyPendingDragOver);
        }
    }, [activeColumn, applyPendingDragOver]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (dragOverFrameRef.current !== null) {
            cancelAnimationFrame(dragOverFrameRef.current);
            dragOverFrameRef.current = null;
        }
        pendingDragOverRef.current = null;

        if (!over) {
            setActiveTask(null);
            setActiveColumn(null);
            lastDragOverKeyRef.current = null;
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        // Handle column reordering
        if (activeId.startsWith("column-") && overId.startsWith("column-")) {
            const activeColumnId = activeId.replace("column-", "");
            const overColumnId = overId.replace("column-", "");
            const currentColumns = sortColumnsByOrder(localColumnsRef.current);

            const activeIndex = currentColumns.findIndex(c => c.id === activeColumnId);
            const overIndex = currentColumns.findIndex(c => c.id === overColumnId);

            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                const newColumns = applyColumnOrder(arrayMove(currentColumns, activeIndex, overIndex));
                setLocalColumns(newColumns);

                // Call API to persist column order
                if (onColumnReorder) {
                    onColumnReorder(newColumns.map(c => c.id));
                }
            }

            setActiveColumn(null);
            lastDragOverKeyRef.current = null;
            return;
        }

        // Handle task movement
        const currentTasks = tasksRef.current;
        const currentLookup = taskLookupRef.current;
        const currentColumns = localColumnsRef.current;
        const currentColumnsById = columnsByIdRef.current;
        const activeIndex = currentLookup.indexById.get(activeId) ?? -1;
        const overIndex = currentLookup.indexById.get(overId) ?? -1;

        if (activeIndex === -1) {
            setActiveTask(null);
            lastDragOverKeyRef.current = null;
            return;
        }

        let newTasks = [...currentTasks];

        if (overIndex !== -1 && activeIndex !== overIndex) {
            newTasks = arrayMove(newTasks, activeIndex, overIndex);
        }

        const activeTask = currentTasks[activeIndex];
        let newPosition = activeTask.position;
        let newColumnId = currentLookup.columnIdByTaskId.get(activeId) || getTaskColumnId(activeTask);
        const droppedOnColumn = currentColumnsById.has(overId);

        // If dropped on a column directly
        if (droppedOnColumn) {
            newColumnId = overId;
        }
        // If dropped on another task, use that task's column
        else {
            const overTask = newTasks.find((task) => task.id === overId);
            if (overTask) {
                newColumnId = getTaskColumnId(overTask);
            }
        }

        // Apply column change for optimistic UI
        if (getTaskColumnId(activeTask) !== newColumnId) {
            newTasks = applyTaskColumnChange(newTasks, activeId, newColumnId, currentColumns);
        }

        // Calculate Position using Fractional Indexing
        if (onTaskMove) {
            // Use the post-drop visual order, not the previous persisted
            // `position` order. Sorting here would undo same-column drops.
            const destColumnTasks = newTasks
                .filter(t => getTaskColumnId(t) === newColumnId);

            // Find the index of the moved task in this sorted list
            const resultIndex = destColumnTasks.findIndex(t => t.id === activeId);

            // Logic: (Prev + Next) / 2
            // P = Prev Position, N = Next Position
            // If first item: P = 0, N = list[1]?.pos ?? 65536. -> New = N / 2? No.
            // Let's standard logic:
            // First item: newPos = nextPos / 2. (If nextPos is 0? Impossible if seeded).
            // Last item: newPos = prevPos + 65536.
            // Middle: (prevPos + nextPos) / 2.

            const prevTask = resultIndex > 0 ? destColumnTasks[resultIndex - 1] : null;
            const nextTask = resultIndex < destColumnTasks.length - 1 ? destColumnTasks[resultIndex + 1] : null;

            const prevPos = prevTask ? prevTask.position : 0;
            const nextPos = nextTask ? nextTask.position : (prevTask ? prevTask.position + 2 * 65536 : 65536);

            // Refined Logic for Empty/Start/End:
            if (!prevTask && !nextTask) {
                // First item in empty list
                newPosition = 65536;
            } else if (!prevTask) {
                // Insert at start
                newPosition = nextPos / 2;
            } else if (!nextTask) {
                // Insert at end
                newPosition = prevPos + 65536;
            } else {
                // Insert in middle
                newPosition = (prevPos + nextPos) / 2;
            }

            newTasks = newTasks.map((task) => (
                task.id === activeId
                    ? {
                        ...task,
                        column_id: newColumnId,
                        column: currentColumnsById.get(newColumnId) || task.column,
                        status: getStatusFromColumn(currentColumnsById.get(newColumnId)),
                        position: newPosition,
                    }
                    : task
            ));

            onTaskMove(activeId, newColumnId, newPosition);
        }

        setTasks(newTasks);
        setActiveTask(null);
        lastDragOverKeyRef.current = null;
    }, [getTaskColumnId, onColumnReorder, onTaskMove]);

    const [activeDetailTask, setActiveDetailTask] = useState<TaskLite | null>(null);

    useEffect(() => {
        if (!initialTaskId) {
            return;
        }

        const task = tasks.find((item) => item.id === initialTaskId);
        if (!task) {
            return;
        }

        setActiveDetailTask(task);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("taskId");
        const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [initialTaskId, pathname, router, searchParams, tasks]);

    const handleTaskClick = useCallback((taskId: string) => {
        const task = taskLookupRef.current.taskById.get(taskId);
        if (task) {
            setActiveDetailTask(task);
        }
    }, []);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            autoScroll={autoScrollOptions}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={sortedColumnIds}
                strategy={horizontalListSortingStrategy}
            >
                <div
                    data-board-dragging={isBoardDragging ? "true" : undefined}
                    className="flex h-[calc(100dvh-16rem)] min-h-[24rem] snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-3 pl-3 pr-6 pb-4 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:h-[calc(100vh-140px)] md:min-h-[28rem] md:gap-5 md:px-0 md:snap-none"
                >
                    {sortedColumns.map((column) => (
                        <SortableColumn
                            key={column.id}
                            column={column}
                            tasks={tasksByColumnId.get(column.id) || []}
                            onTaskClick={handleTaskClick}
                            onAddTask={addTaskHandlersByColumnId.get(column.id)}
                            onEditColumn={onEditColumn}
                            isBoardDragging={isBoardDragging}
                            isTaskDragging={isTaskDragging}
                            isColumnDragging={isColumnDragging}
                        />
                    ))}

                    {/* Add Column Button */}
                    {onAddColumn && (
                        <div className="w-[min(17.5rem,calc(100vw-5.75rem))] flex-shrink-0 snap-start snap-always md:w-72 md:max-w-none md:snap-center">
                            <button
                                onClick={onAddColumn}
                                className="kanban-icon-button group flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-[1.2rem] border-2 border-dashed border-slate-200 bg-white/60 text-slate-500 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl hover:border-slate-400 hover:bg-white hover:text-slate-950 hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.36)] md:h-12"
                            >
                                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                                Add Column
                            </button>
                        </div>
                    )}
                </div>
            </SortableContext>

            {hasMounted
                ? createPortal(
                    <DragOverlay dropAnimation={null}>
                        {activeTask ? (
                            <div className="pointer-events-none">
                                <TaskCard task={activeTask} sortable={false} isBoardDragging elevated />
                            </div>
                        ) : null}
                        {activeColumn ? (
                            <div className="pointer-events-none max-h-[500px] w-80 overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/92 shadow-[0_34px_72px_-30px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
                                <div className="flex items-center gap-2 bg-white/82 px-3 py-3">
                                    <GripVertical className="w-4 h-4 text-slate-500" />
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: activeColumn.color }}
                                    />
                                    <span className="font-semibold text-sm">{activeColumn.name}</span>
                                    <span className="text-sm text-slate-500">({activeColumnTasks.length})</span>
                                </div>
                                <div className="max-h-[400px] space-y-2 overflow-hidden p-3">
                                    {activeColumnTasks.slice(0, 3).map((task) => (
                                        <div
                                            key={task.id}
                                            className="rounded-[1rem] border border-black/5 bg-white/78 p-3"
                                        >
                                            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                        </div>
                                    ))}
                                    {activeColumnTasks.length > 3 && (
                                        <div className="text-xs text-muted-foreground text-center py-1">
                                            +{activeColumnTasks.length - 3} more tasks
                                        </div>
                                    )}
                                    {activeColumnTasks.length === 0 && (
                                        <div className="text-sm text-muted-foreground italic text-center py-4">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>,
                    document.body
                )
                : null}

            {activeDetailTask && (
                <TaskDetailModal
                    task={activeDetailTask}
                    projectColumns={localColumns}
                    onClose={() => setActiveDetailTask(null)}
                    onUpdate={(updatedTask) => {
                        setTasks((prev) => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
                        setActiveDetailTask(updatedTask);
                    }}
                    onDelete={async (taskId) => {
                        if (onTaskDelete) {
                            await onTaskDelete(taskId);
                        }
                        setTasks((prev) => prev.filter(t => t.id !== taskId));
                        setActiveDetailTask(null);
                    }}
                />
            )}
        </DndContext>
    );
}
