"use client";

import Image from "@/components/app-image";
import { usePathname, useRouter, useSearchParams } from "@/lib/navigation";
import { Column, Task } from "@/lib/types";
import { TaskDetailModal } from "./task-detail-modal";
import { useEffect, useMemo, useState } from "react";
import { Flag, User } from "lucide-react";
import { LabelBadge } from "@/components/ui/label-badge";
import { priorityToneMap, statusToneMap } from "@/lib/task-ui";

interface TaskGridViewProps {
    tasks: Task[];
    columns: Column[];
    initialTaskId?: string;
    onUpdate?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
}

export function TaskGridView({ tasks, columns, initialTaskId, onUpdate, onDelete }: TaskGridViewProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialTask = useMemo(
        () => (initialTaskId ? tasks.find((item) => item.id === initialTaskId) ?? null : null),
        [initialTaskId, tasks]
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

    return (
        <>
            <div className="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {tasks.length === 0 ? (
                    <div className="col-span-full rounded-[1.8rem] border border-white/80 bg-white/82 py-16 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
                        <p className="text-lg font-semibold text-slate-950">No tasks yet</p>
                        <p className="mt-2 text-sm text-slate-500">Create your first task to get started</p>
                    </div>
                ) : (
                    tasks.map((task) => {
                        const priority = priorityToneMap[task.priority] || priorityToneMap.MEDIUM;
                        const status = statusToneMap[task.status] || statusToneMap.TODO;

                        return (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="group cursor-pointer rounded-[1.3rem] border border-white/80 bg-white/86 p-4 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.38)] backdrop-blur-2xl transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_28px_52px_-34px_rgba(15,23,42,0.45)]"
                            >
                                {/* Status Badge */}
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                                        {status.label}
                                    </span>
                                    {/* <span className="text-xs font-mono text-muted-foreground">
                                        #{task.order}
                                    </span> */}
                                </div>

                                {/* Title */}
                                <h3 className="mb-2 text-base font-medium text-foreground transition-colors group-hover:text-primary line-clamp-2">
                                    {task.title}
                                </h3>

                                {/* Description Preview */}
                                {task.description && (
                                    <p className="mb-3 break-words text-sm text-muted-foreground line-clamp-2">
                                        {task.description.replace(/<[^>]*>/g, '')}
                                    </p>
                                )}

                                {/* Labels */}
                                {task.labels && task.labels.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-1">
                                        {task.labels.slice(0, 2).map((label) => (
                                            <LabelBadge key={label.id} label={label} size="sm" />
                                        ))}
                                        {task.labels.length > 2 && (
                                            <span className="text-xs text-muted-foreground px-2 py-0.5">
                                                +{task.labels.length - 2}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-end justify-between gap-3 border-t border-black/5 pt-3">
                                    {/* Priority */}
                                    <span className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${priority.badgeClassName}`}>
                                        <Flag className="w-3 h-3" />
                                        {task.priority === "HIGH" ? "High" : priority.label}
                                    </span>

                                    {/* Assignee */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        {task.assignee ? (
                                            <>
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10" title={task.assignee.name}>
                                                    {task.assignee.avatar_url ? (
                                                        <Image
                                                            src={task.assignee.avatar_url}
                                                            alt={task.assignee.name}
                                                            width={28}
                                                            height={28}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-medium text-primary">
                                                            {task.assignee.name.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="truncate text-xs text-muted-foreground sm:hidden">
                                                    {task.assignee.name}
                                                </span>
                                            </>
                                        ) : (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground">
                                                <User className="w-3 h-3 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
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
