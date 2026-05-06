"use client";

import { useMemo } from "react";
import Link from "@/components/app-link";
import { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/board/task-card";
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
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                    <Circle className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No tasks assigned yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    When tasks are assigned to you, they&apos;ll appear here as cards.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sortedTasks.map((task) => (
                <Link
                    key={task.id}
                    href={getTaskHref(task)}
                    className="block rounded-[1.15rem] shadow-[0_22px_44px_-22px_rgba(15,23,42,0.22)] transition-shadow duration-200 ease-out hover:shadow-[0_28px_56px_-20px_rgba(15,23,42,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <TaskCard task={task} sortable={false} showProjectContext showStatusBadge />
                </Link>
            ))}
        </div>
    );
}
