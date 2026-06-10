"use client";

import { use, useMemo } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskListView } from "@/components/board/task-list-view";
import { CreateTaskFormValues, CreateTaskModal } from "@/components/modals/create-task-modal";
import { CreateColumnModal } from "@/components/modals/create-column-modal";
import { EditColumnModal } from "@/components/modals/edit-column-modal";
import { Plus, Filter, ArrowUpDown, Columns, List } from "lucide-react";
import { Column, Task, TaskStatus } from "@/lib/types";
import {
    useProject,
    useProjectColumns,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useCreateColumn,
    useUpdateColumn,
    useDeleteColumn,
    useReorderColumns
} from "@/lib/hooks/use-project";
import { getTaskColumnId } from "@/lib/task-ui";
import { useStore } from "@/lib/store";
import { getTeamBySlug } from "@/lib/api";

type ViewMode = "board" | "list";

function getStatusFromColumn(columnId: string | undefined, columns: Column[]): TaskStatus {
    const column = columns.find((item) => item.id === columnId);

    if (!column) return "TODO";
    if (column.type === "done") return "DONE";
    if (column.type === "in_progress") return "IN_PROGRESS";

    const normalizedName = column.name.trim().toUpperCase().replace(/\s+/g, "_");
    if (normalizedName === "IN_PROGRESS" || normalizedName === "DONE" || normalizedName === "BACKLOG" || normalizedName === "TODO") {
        return normalizedName;
    }

    return "TODO";
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const currentTeam = useStore((state) => state.currentTeam);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [defaultColumnId, setDefaultColumnId] = useState<string>("");
    const [viewMode, setViewMode] = useState<ViewMode>("board");

    // Queries
    const { data: project, isLoading: isProjectLoading } = useProject(id);
    const { data: columns = [], isLoading: isColumnsLoading } = useProjectColumns(id);

    // Derived state
    const tasks = project?.tasks || [];
    const isLoading = isProjectLoading || isColumnsLoading;
    const availableAssignees = useMemo(() => {
        const members = project?.members || [];
        const taskAssignees = tasks
            .map((task) => task.assignee)
            .filter((assignee): assignee is NonNullable<Task["assignee"]> => Boolean(assignee));

        const byId = new Map<string, NonNullable<Task["assignee"]>>();
        [...members, ...taskAssignees].forEach((assignee) => {
            byId.set(assignee.id, assignee);
        });

        return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
    }, [project?.members, tasks]);
    const shouldHydrateTeamMembers = !!currentTeam?.slug && (!currentTeam.members || currentTeam.members.length === 0);
    const { data: hydratedCurrentTeam } = useQuery({
        queryKey: ["teams", "detail", currentTeam?.slug],
        queryFn: () => getTeamBySlug(currentTeam!.slug),
        enabled: shouldHydrateTeamMembers,
        staleTime: 5 * 60 * 1000,
    });
    const delegateAssignees = useMemo(() => {
        const teamMembers = hydratedCurrentTeam?.members?.length
            ? hydratedCurrentTeam.members
            : currentTeam?.members || [];
        const projectMembers = project?.members || [];
        const taskAssignees = tasks
            .map((task) => task.assignee)
            .filter((assignee): assignee is NonNullable<Task["assignee"]> => Boolean(assignee));

        const byId = new Map<string, NonNullable<Task["assignee"]>>();
        [...teamMembers, ...projectMembers, ...taskAssignees].forEach((user) => {
            byId.set(user.id, user);
        });

        return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
    }, [hydratedCurrentTeam?.members, currentTeam?.members, project?.members, tasks]);

    // Mutations
    const createTaskMutation = useCreateTask(id);
    const updateTaskMutation = useUpdateTask(id);
    const deleteTaskMutation = useDeleteTask(id);
    const createColumnMutation = useCreateColumn(id);
    const updateColumnMutation = useUpdateColumn(id);
    const deleteColumnMutation = useDeleteColumn(id);
    const reorderColumnsMutation = useReorderColumns(id);

    const handleCreateTask = async ({ title, status, columnId, assigneeId, priority, dueDate, labelIds }: CreateTaskFormValues) => {
        // Find column ID by status if using legacy status
        const targetColumn = columns.find(c => c.name.toUpperCase() === status) || columns[0];

        await createTaskMutation.mutateAsync({
            title,
            status,
            columnId: columnId || defaultColumnId || targetColumn?.id,
            assigneeId,
            priority,
            dueDate,
            labelIds,
        });
        setIsTaskModalOpen(false);
    };

    const openCreateTask = (columnId?: string) => {
        setDefaultColumnId(columnId || columns[0]?.id || "");
        setIsTaskModalOpen(true);
    };

    // Correct signature matching TaskListView/GridView props
    const handleTaskUpdateWrapper = (updatedTask: any) => {
        updateTaskMutation.mutate({
            taskId: updatedTask.id,
            updates: updatedTask
        });
    };

    const handleTaskDelete = async (taskId: string) => {
        await deleteTaskMutation.mutateAsync(taskId);
    };

    const handleAddColumn = async (name: string, color: string, type?: string) => {
        await createColumnMutation.mutateAsync({ name, color, type });
    };

    const handleUpdateColumn = async (columnId: string, name: string, color: string, type?: 'default' | 'in_progress' | 'done') => {
        await updateColumnMutation.mutateAsync({ columnId, updates: { name, color, type } });
    };

    const handleDeleteColumn = async (columnId: string, destinationColumnId?: string) => {
        await deleteColumnMutation.mutateAsync({ columnId, destinationColumnId });
        setEditingColumn(null);
    };

    const handleColumnReorder = async (columnIds: string[]) => {
        // Optimistic update handled by React Query cache invalidation
        // But for drag smoothness, DND kit handles local state
        // We just need to sync with server
        await reorderColumnsMutation.mutateAsync(columnIds);
    };

    const handleTaskMove = async (taskId: string, columnId: string, newPosition: number) => {
        const nextStatus = getStatusFromColumn(columnId, columns);
        await updateTaskMutation.mutateAsync({
            taskId,
            updates: { column_id: columnId, position: newPosition, status: nextStatus }
        });
    };

    if (isLoading || !project) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading project...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground break-words">{project.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your tasks and track progress.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => openCreateTask()}
                        className="min-h-11 md:min-h-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 transition-colors font-medium shadow-sm hover:shadow"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode("board")}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0 p-2 rounded-md transition-all ${viewMode === "board"
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        title="Board View"
                    >
                        <Columns className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0 p-2 rounded-md transition-all ${viewMode === "list"
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex min-h-11 md:min-h-0 items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex min-h-11 md:min-h-0 items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort
                    </button>
                </div>
            </div>

            {/* Task View */}
            <div className="flex-1 overflow-hidden">
                {viewMode === "board" ? (
                    <KanbanBoard
                        initialTasks={tasks}
                        columns={columns}
                        onAddTask={openCreateTask}
                        onTaskMove={handleTaskMove}
                        onTaskDelete={handleTaskDelete}
                        onAddColumn={() => setIsColumnModalOpen(true)}
                        onEditColumn={(column) => setEditingColumn(column)}
                        onColumnReorder={handleColumnReorder}
                    />
                ) : viewMode === "list" ? (
                    <div className="h-full overflow-y-auto">
                        <TaskListView
                            tasks={tasks}
                            columns={columns}
                            onUpdate={handleTaskUpdateWrapper}
                            onDelete={handleTaskDelete}
                        />
                    </div>
                ) : null}
            </div>

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSubmit={handleCreateTask}
                projects={project ? [project] : []}
                initialProjectId={project?.id}
                initialStatus={getStatusFromColumn(defaultColumnId, columns)}
                seededColumnId={defaultColumnId || undefined}
                projectColumns={columns}
                lockProjectSelection
                isSubmitting={createTaskMutation.isPending}
                assignees={delegateAssignees}
                teamSlug={project?.team?.slug}
                teamId={project?.team?.id || project?.team_id}
            />

            <CreateColumnModal
                isOpen={isColumnModalOpen}
                onClose={() => setIsColumnModalOpen(false)}
                onSubmit={handleAddColumn}
                columns={columns}
            />

            {editingColumn && (
                <EditColumnModal
                    isOpen={!!editingColumn}
                    column={editingColumn}
                    columns={columns}
                    taskCount={tasks.filter((task) => getTaskColumnId(task, columns) === editingColumn.id).length}
                    onClose={() => setEditingColumn(null)}
                    onSubmit={handleUpdateColumn}
                    onDelete={handleDeleteColumn}
                />
            )}
        </div>
    );
}
