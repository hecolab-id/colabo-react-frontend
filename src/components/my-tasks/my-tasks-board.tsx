"use client";

import { useMemo } from "react";
import Link from "@/components/app-link";
import { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/board/task-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

const STATUS_PRIORITY: Record<TaskStatus, number> = {
    IN_PROGRESS: 0,
    TODO: 1,
    BACKLOG: 2,
    DONE: 3,
};

function statusRank(status: Task["status"]): number {
    return STATUS_PRIORITY[status as TaskStatus] ?? STATUS_PRIORITY.TODO;
}

function isTaskDone(task: Task): boolean {
    return task.status === "DONE" || task.column?.type === "done";
}

function dueDateRank(date: string | null | undefined): number {
    if (!date) return Number.POSITIVE_INFINITY;
    const ts = new Date(date).getTime();
    return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

interface MyTasksBoardProps {
    tasks: Task[];
    getTaskHref: (task: Task) => string;
}

export function MyTasksBoard({ tasks, getTaskHref }: MyTasksBoardProps) {
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const statusDiff = statusRank(a.status) - statusRank(b.status);
            if (statusDiff !== 0) return statusDiff;
            return dueDateRank(a.due_date) - dueDateRank(b.due_date);
        });
    }, [tasks]);

    if (sortedTasks.length === 0) {
        return (
            <EmptyState
                icon={<Circle className="h-6 w-6 text-slate-400" aria-hidden="true" />}
                title="No tasks assigned yet"
                description="When tasks are assigned to you, they'll appear here as cards."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sortedTasks.map((task) => {
                const done = isTaskDone(task);
                return (
                    <Link
                        key={task.id}
                        href={getTaskHref(task)}
                        className={cn(
                            "block rounded-[1.15rem] shadow-[0_22px_44px_-22px_rgba(15,23,42,0.22)] transition-shadow duration-200 ease-out hover:shadow-[0_28px_56px_-20px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            done && "opacity-60 grayscale transition-all hover:grayscale-0"
                        )}
                    >
                        <TaskCard task={task} sortable={false} showProjectContext showStatusBadge />
                    </Link>
                );
            })}
        </div>
    );
}
