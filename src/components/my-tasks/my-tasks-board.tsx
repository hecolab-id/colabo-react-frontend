"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "@/lib/navigation";
import { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/board/task-card";
import { cn } from "@/lib/utils";

const COLUMN_ORDER: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

const COLUMN_LABELS: Record<TaskStatus, string> = {
    BACKLOG: "Backlog",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
};

const COLUMN_DOT_CLASS: Record<TaskStatus, string> = {
    BACKLOG: "bg-slate-300",
    TODO: "bg-slate-400",
    IN_PROGRESS: "bg-sky-400",
    DONE: "bg-emerald-400",
};

interface MyTasksBoardProps {
    tasks: Task[];
    getTaskHref: (task: Task) => string;
    onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

function normalizeStatus(status: TaskStatus | undefined): TaskStatus {
    if (status === "BACKLOG" || status === "TODO" || status === "IN_PROGRESS" || status === "DONE") {
        return status;
    }
    return "TODO";
}

function isStatusKey(value: string): value is TaskStatus {
    return value === "BACKLOG" || value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

export function MyTasksBoard({ tasks, getTaskHref, onTaskStatusChange }: MyTasksBoardProps) {
    const router = useRouter();
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const previousTasksRef = useRef(tasks);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (previousTasksRef.current === tasks) {
            return;
        }
        previousTasksRef.current = tasks;
        setLocalTasks(tasks);
    }, [tasks]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const tasksByStatus = useMemo(() => {
        const map: Record<TaskStatus, Task[]> = { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] };
        for (const task of localTasks) {
            map[normalizeStatus(task.status)].push(task);
        }
        return map;
    }, [localTasks]);

    const taskById = useMemo(() => {
        const map = new Map<string, Task>();
        for (const task of localTasks) {
            map.set(task.id, task);
        }
        return map;
    }, [localTasks]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const id = String(event.active.id);
        const task = taskById.get(id);
        if (task) {
            setActiveTask(task);
        }
    }, [taskById]);

    const moveTaskToStatus = useCallback((taskId: string, targetStatus: TaskStatus) => {
        setLocalTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === taskId);
            if (idx === -1 || normalizeStatus(prev[idx].status) === targetStatus) {
                return prev;
            }
            const next = [...prev];
            next[idx] = { ...next[idx], status: targetStatus };
            return next;
        });
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = String(active.id);
        const overId = String(over.id);

        const overStatus = isStatusKey(overId) ? overId : normalizeStatus(taskById.get(overId)?.status);
        const activeStatus = normalizeStatus(taskById.get(activeId)?.status);

        if (overStatus !== activeStatus) {
            moveTaskToStatus(activeId, overStatus);
        }
    }, [moveTaskToStatus, taskById]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const original = tasks.find((t) => t.id === activeId);
        if (!original) return;

        const targetStatus = isStatusKey(overId) ? overId : normalizeStatus(taskById.get(overId)?.status);

        if (normalizeStatus(original.status) !== targetStatus) {
            onTaskStatusChange(activeId, targetStatus);
        }
    }, [onTaskStatusChange, tasks, taskById]);

    const handleTaskClick = useCallback((task: Task) => {
        router.push(getTaskHref(task));
    }, [getTaskHref, router]);

    const isDragging = Boolean(activeTask);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveTask(null)}
        >
            <div
                data-board-dragging={isDragging ? "true" : undefined}
                className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible"
            >
                {COLUMN_ORDER.map((status) => (
                    <BoardColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus[status]}
                        onTaskClick={handleTaskClick}
                    />
                ))}
            </div>

            {hasMounted
                ? createPortal(
                      <DragOverlay dropAnimation={null}>
                          {activeTask ? (
                              <div className="pointer-events-none w-72">
                                  <TaskCard task={activeTask} sortable={false} isBoardDragging showProjectContext />
                              </div>
                          ) : null}
                      </DragOverlay>,
                      document.body,
                  )
                : null}
        </DndContext>
    );
}

function BoardColumn({
    status,
    tasks,
    onTaskClick,
}: {
    status: TaskStatus;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}) {
    const { setNodeRef, isOver } = useSortable({
        id: status,
        data: { type: "column", status },
    });

    const itemIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

    return (
        <section
            ref={setNodeRef}
            className={cn(
                "flex w-72 shrink-0 flex-col gap-3 rounded-[1.4rem] p-2 transition-colors lg:w-auto",
                isOver && "bg-primary/5 ring-1 ring-primary/20",
            )}
            aria-label={`${COLUMN_LABELS[status]} column`}
        >
            <header className="flex items-center justify-between rounded-[1.1rem] border border-white/70 bg-white/78 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", COLUMN_DOT_CLASS[status])} />
                    <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                        {COLUMN_LABELS[status]}
                    </h3>
                </div>
                <span className="text-xs font-medium tabular-nums text-slate-400">{tasks.length}</span>
            </header>

            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div className="flex min-h-[6rem] flex-col gap-2.5">
                    {tasks.length === 0 ? (
                        <p className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-400">
                            No tasks
                        </p>
                    ) : (
                        tasks.map((task) => (
                            <BoardTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                        ))
                    )}
                </div>
            </SortableContext>
        </section>
    );
}

function BoardTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
        id: task.id,
        data: { type: "task", taskId: task.id },
        animateLayoutChanges: () => false,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn("rounded-[1.15rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", isDragging && "opacity-50")}
            {...attributes}
            {...listeners}
        >
            <TaskCard task={task} sortable={false} showProjectContext />
        </div>
    );
}
