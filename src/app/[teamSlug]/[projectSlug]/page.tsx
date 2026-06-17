"use client";

import { lazy, Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeamBySlug } from "@/lib/api";
import type { CreateTaskFormValues } from "@/components/modals/create-task-modal";
import { ManageProjectMembersModal } from "@/components/modals/manage-project-members-modal";
import { EditColumnModal } from "@/components/modals/edit-column-modal";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Column, Project, Task, TaskStatus } from "@/lib/types";
import { DueDateFilter, TaskSortOption, getTaskColumnId, matchesDueDateFilter, sortTasks } from "@/lib/task-ui";
import {
    ProjectControlsContent,
    ProjectControlsPopover,
    ProjectControlsTrigger,
    ProjectFilterState,
    ProjectMobileActionBar,
    ProjectViewMode,
    ProjectViewModeSwitcher,
} from "@/components/project/project-toolbar";
import {
    useProjectBySlugs,
    useProjectColumns,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useCreateColumn,
    useUpdateColumn,
    useDeleteColumn,
    useReorderColumns,
    useDeleteProject,
    projectKeys
} from "@/lib/hooks/use-project";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/toast";

const KanbanBoard = lazy(() => import("@/components/board/kanban-board").then((module) => ({ default: module.KanbanBoard })));
const TaskCalendarView = lazy(() => import("@/components/board/task-calendar-view").then((module) => ({ default: module.TaskCalendarView })));
const TaskTimelineView = lazy(() => import("@/components/board/task-timeline-view").then((module) => ({ default: module.TaskTimelineView })));
const TaskListView = lazy(() => import("@/components/board/task-list-view").then((module) => ({ default: module.TaskListView })));
const CreateTaskModal = lazy(() => import("@/components/modals/create-task-modal").then((module) => ({ default: module.CreateTaskModal })));
const CreateColumnModal = lazy(() => import("@/components/modals/create-column-modal").then((module) => ({ default: module.CreateColumnModal })));
const DeleteProjectModal = lazy(() => import("@/components/modals/delete-project-modal").then((module) => ({ default: module.DeleteProjectModal })));

type ProjectWithTasks = Project & {
    tasks?: Task[];
};

const defaultFilters: ProjectFilterState = {
    columnIds: [],
    priorities: [],
    assigneeIds: [],
    labelIds: [],
    dueDate: "all",
};

const sortLabels: Record<TaskSortOption, string> = {
    default: "Manual",
    due_date: "Due Date",
    priority: "Priority",
    updated_at: "Recently Updated",
};

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

function ProjectSlugPageContent({ params }: { params: Promise<{ teamSlug: string; projectSlug: string }> }) {
    const { teamSlug, projectSlug } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const currentTeam = useStore((state) => state.currentTeam);
    const currentUser = useStore((state) => state.user);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [defaultColumnId, setDefaultColumnId] = useState<string>("");
    const [viewMode, setViewMode] = useState<ProjectViewMode>("board");
    const [filters, setFilters] = useState<ProjectFilterState>(defaultFilters);
    const [sortOption, setSortOption] = useState<TaskSortOption>("default");
    const [isControlsOpen, setIsControlsOpen] = useState(false);
    const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
    const controlsMenuRef = useRef<HTMLDivElement>(null);
    const mobileControlsRef = useRef<HTMLDivElement>(null);

    // Queries
    const { data: project, isLoading: isProjectLoading, refetch: refetchProject } = useProjectBySlugs(teamSlug, projectSlug);
    const projectId = project?.id || "";
    const { data: columns = [], isLoading: isColumnsLoading } = useProjectColumns(projectId);

    // Derived state
    const tasks = useMemo(() => project?.tasks ?? [], [project?.tasks]);
    const isLoading = isProjectLoading || (isColumnsLoading && !!projectId);
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
    const availableLabels = useMemo(() => {
        const byId = new Map<string, NonNullable<Task["labels"]>[number]>();

        tasks.forEach((task) => {
            task.labels?.forEach((label) => {
                byId.set(label.id, label);
            });
        });

        return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
    }, [tasks]);
    const visibleTasks = useMemo(() => {
        const now = new Date();
        const filteredTasks = tasks.filter((task) => {
            const columnId = getTaskColumnId(task, columns);

            if (filters.columnIds.length > 0 && !filters.columnIds.includes(columnId)) {
                return false;
            }

            if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
                return false;
            }

            if (filters.assigneeIds.length > 0 && (!task.assignee_id || !filters.assigneeIds.includes(task.assignee_id))) {
                return false;
            }

            if (filters.labelIds.length > 0) {
                const taskLabelIds = task.labels?.map((label) => label.id) || [];
                const hasMatchingLabel = filters.labelIds.some((labelId) => taskLabelIds.includes(labelId));
                if (!hasMatchingLabel) {
                    return false;
                }
            }

            if (!matchesDueDateFilter(task, filters.dueDate, now)) {
                return false;
            }

            return true;
        });

        return sortTasks(filteredTasks, columns, sortOption);
    }, [columns, filters, sortOption, tasks]);
    const activeFilterCount =
        filters.columnIds.length +
        filters.priorities.length +
        filters.assigneeIds.length +
        filters.labelIds.length +
        (filters.dueDate === "all" ? 0 : 1);
    const hasVisibleFilters = activeFilterCount > 0;
    const mobileViewStorageKey = projectId ? `colabo:project-mobile-view:${projectId}` : "";
    const initialTaskId = searchParams.get("taskId") || undefined;
    const canManageProjectMembers = !!currentTeam && !!currentUser && (
        currentTeam.owner_id === currentUser.id ||
        ["OWNER", "ADMIN"].includes((currentTeam.role || "").toUpperCase())
    );
    const canDeleteProject = canManageProjectMembers;

    // Mutations - Only active when we have IDs
    const createTaskMutation = useCreateTask(projectId);
    const updateTaskMutation = useUpdateTask(projectId);
    const deleteTaskMutation = useDeleteTask(projectId);
    const createColumnMutation = useCreateColumn(projectId);
    const updateColumnMutation = useUpdateColumn(projectId);
    const deleteColumnMutation = useDeleteColumn(projectId);
    const reorderColumnsMutation = useReorderColumns(projectId);
    const deleteProjectMutation = useDeleteProject();

    const handleCreateTask = async ({ title, status, columnId, assigneeId, priority, dueDate, startDate, labelIds }: CreateTaskFormValues) => {
        // Find column ID by status if using legacy status
        const targetColumn = columns.find((c) => c.name.toUpperCase() === status) || columns[0];

        await createTaskMutation.mutateAsync({
            title,
            status,
            columnId: columnId || defaultColumnId || targetColumn?.id,
            assigneeId,
            priority,
            dueDate,
            startDate,
            labelIds,
        });
        setIsTaskModalOpen(false);
    };

    const openCreateTask = (columnId?: string) => {
        setDefaultColumnId(columnId || columns[0]?.id || "");
        setIsTaskModalOpen(true);
    };

    const handleTaskUpdateWrapper = (updatedTask: Task) => {
        queryClient.setQueryData<ProjectWithTasks | undefined>(
            projectKeys.detailBySlugs(teamSlug, projectSlug),
            (currentProject) => {
                if (!currentProject) {
                    return currentProject;
                }

                return {
                    ...currentProject,
                    tasks: (currentProject.tasks || []).map((task) => (
                        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                    )),
                };
            },
        );

        queryClient.setQueryData<ProjectWithTasks | undefined>(
            projectKeys.detail(projectId),
            (currentProject) => {
                if (!currentProject) {
                    return currentProject;
                }

                return {
                    ...currentProject,
                    tasks: (currentProject.tasks || []).map((task) => (
                        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                    )),
                };
            },
        );

        queryClient.invalidateQueries({
            queryKey: projectKeys.detailBySlugs(teamSlug, projectSlug),
            refetchType: "inactive",
        });
    };

    const handleTaskDelete = async (taskId: string) => {
        try {
            await deleteTaskMutation.mutateAsync(taskId);
        } catch (error) {
            console.error("Failed to delete task:", error);
            toast.error("Couldn't delete the task. Please try again.");
        }
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
        try {
            await reorderColumnsMutation.mutateAsync(columnIds);
        } catch (error) {
            console.error("Failed to reorder columns:", error);
            toast.error("Couldn't reorder columns. Please try again.");
        }
    };

    const handleTaskMove = async (taskId: string, columnId: string, newPosition: number) => {
        const nextStatus = getStatusFromColumn(columnId, columns);
        try {
            await updateTaskMutation.mutateAsync({
                taskId,
                updates: { column_id: columnId, position: newPosition, status: nextStatus }
            });
        } catch (error) {
            console.error("Failed to move task:", error);
            toast.error("Couldn't move the task. It has been reverted.");
        }
    };

    const handleProjectDelete = async (id: string) => {
        await deleteProjectMutation.mutateAsync(id);
        router.push("/dashboard");
    };

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (controlsMenuRef.current && !controlsMenuRef.current.contains(target)) {
                setIsControlsOpen(false);
            }

            if (mobileControlsRef.current && !mobileControlsRef.current.contains(target)) {
                setIsMobileControlsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    useEffect(() => {
        if (!projectId || typeof window === "undefined") {
            return;
        }

        let frameId = 0;

        if (window.matchMedia("(max-width: 767px)").matches) {
            const savedViewMode = window.localStorage.getItem(mobileViewStorageKey) as ProjectViewMode | null;
            frameId = window.requestAnimationFrame(() => {
                setViewMode(savedViewMode === "board" || savedViewMode === "list" || savedViewMode === "calendar" || savedViewMode === "timeline" ? savedViewMode : "list");
            });
        } else {
            frameId = window.requestAnimationFrame(() => {
                setViewMode("board");
            });
        }

        return () => window.cancelAnimationFrame(frameId);
    }, [mobileViewStorageKey, projectId]);

    useEffect(() => {
        if (!mobileViewStorageKey || typeof window === "undefined") {
            return;
        }

        if (!window.matchMedia("(max-width: 767px)").matches) {
            return;
        }

        window.localStorage.setItem(mobileViewStorageKey, viewMode);
    }, [mobileViewStorageKey, viewMode]);

    if (isLoading || !project) {
        return (
            <div className="flex h-64 items-center justify-center rounded-[1.8rem] border border-white/70 bg-white/72 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="text-muted-foreground">Loading project…</div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-x-hidden">
            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
                <div className="hidden md:block">
                    <ProjectViewModeSwitcher viewMode={viewMode} onChange={setViewMode} />
                </div>

                <div className="md:hidden" ref={mobileControlsRef}>
                    <ProjectMobileActionBar
                        viewMode={viewMode}
                        onViewChange={setViewMode}
                        onOpenControls={() => setIsMobileControlsOpen((prev) => !prev)}
                        isControlsOpen={isMobileControlsOpen}
                        hasActiveControls={hasVisibleFilters || sortOption !== "default"}
                        controlsCount={activeFilterCount + (sortOption === "default" ? 0 : 1)}
                    />

                    {isMobileControlsOpen && (
                        <ProjectControlsPopover
                            isOpen={isMobileControlsOpen}
                            title="Controls"
                            description="Manage sorting, filters, and project actions."
                            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+184px)] z-[35]"
                        >
                            <ProjectControlsContent
                                columns={columns}
                                filters={filters}
                                setFilters={setFilters}
                                sortOption={sortOption}
                                setSortOption={setSortOption}
                                sortLabels={sortLabels}
                                availableAssignees={availableAssignees}
                                availableLabels={availableLabels}
                                visibleTasksCount={visibleTasks.length}
                                totalTasksCount={tasks.length}
                                onResetAll={() => {
                                    setFilters(defaultFilters);
                                    setSortOption("default");
                                }}
                                onViewProject={() => {
                                    setIsMobileControlsOpen(false);
                                    router.push(`/${teamSlug}/${projectSlug}/settings`);
                                }}
                                onManageMembers={() => {
                                    setIsMobileControlsOpen(false);
                                    setIsMembersModalOpen(true);
                                }}
                                onDeleteProject={() => {
                                    setIsMobileControlsOpen(false);
                                    setIsDeleteModalOpen(true);
                                }}
                                canManageProjectMembers={canManageProjectMembers}
                                canDeleteProject={canDeleteProject}
                            />
                        </ProjectControlsPopover>
                    )}
                </div>

                <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center">
                    <div className="relative" ref={controlsMenuRef}>
                        <ProjectControlsTrigger
                            isOpen={isControlsOpen}
                            hasActiveControls={hasVisibleFilters || sortOption !== "default"}
                            count={activeFilterCount + (sortOption === "default" ? 0 : 1)}
                            onClick={() => setIsControlsOpen((prev) => !prev)}
                            label={sortOption === "default" ? "Controls" : `Controls · ${sortLabels[sortOption]}`}
                        />
                        <ProjectControlsPopover
                            isOpen={isControlsOpen}
                            title="Controls"
                            description="Refine tasks, change sorting, and reach core project actions."
                            className="absolute inset-x-0 top-full z-30 mt-2 md:inset-x-auto md:right-0 md:w-[340px]"
                        >
                            <ProjectControlsContent
                                columns={columns}
                                filters={filters}
                                setFilters={setFilters}
                                sortOption={sortOption}
                                setSortOption={setSortOption}
                                sortLabels={sortLabels}
                                availableAssignees={availableAssignees}
                                availableLabels={availableLabels}
                                visibleTasksCount={visibleTasks.length}
                                totalTasksCount={tasks.length}
                                onResetAll={() => {
                                    setFilters(defaultFilters);
                                    setSortOption("default");
                                }}
                                onViewProject={() => {
                                    setIsControlsOpen(false);
                                    router.push(`/${teamSlug}/${projectSlug}/settings`);
                                }}
                                onManageMembers={() => {
                                    setIsControlsOpen(false);
                                    setIsMembersModalOpen(true);
                                }}
                                onDeleteProject={() => {
                                    setIsControlsOpen(false);
                                    setIsDeleteModalOpen(true);
                                }}
                                canManageProjectMembers={canManageProjectMembers}
                                canDeleteProject={canDeleteProject}
                            />
                        </ProjectControlsPopover>
                    </div>
                </div>
            </div>

            <div className="mb-4 hidden flex-col gap-2 text-sm text-muted-foreground md:flex md:flex-row md:items-center md:justify-between">
                <span className="min-w-0">
                    Showing {visibleTasks.length} of {tasks.length} tasks
                </span>
                {(hasVisibleFilters || sortOption !== "default") && (
                    <button
                        onClick={() => {
                            setFilters(defaultFilters);
                            setSortOption("default");
                        }}
                        className="w-fit touch-manipulation font-medium text-primary transition-colors hover:text-primary/80"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Task View */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/55 p-3 shadow-[0_22px_56px_rgba(15,23,42,0.06)] backdrop-blur-xl md:p-3">
                <Suspense fallback={<div className="flex h-64 items-center justify-center text-muted-foreground">Loading workspace…</div>}>
                    {viewMode === "board" ? (
                        <KanbanBoard
                            initialTasks={visibleTasks}
                            columns={columns}
                            initialTaskId={initialTaskId}
                            onAddTask={openCreateTask}
                            onTaskMove={handleTaskMove}
                            onTaskDelete={handleTaskDelete}
                            onAddColumn={() => setIsColumnModalOpen(true)}
                            onEditColumn={(column) => setEditingColumn(column)}
                            onColumnReorder={handleColumnReorder}
                        />
                    ) : viewMode === "list" ? (
                        <div className="h-full overflow-y-auto overflow-x-hidden">
                            <TaskListView
                                tasks={visibleTasks}
                                columns={columns}
                                initialTaskId={initialTaskId}
                                onUpdate={handleTaskUpdateWrapper}
                                onDelete={handleTaskDelete}
                            />
                        </div>
                    ) : viewMode === "calendar" ? (
                        <div className="h-full overflow-y-auto overflow-x-hidden">
                            <TaskCalendarView
                                tasks={visibleTasks}
                                columns={columns}
                                initialTaskId={initialTaskId}
                                onUpdate={handleTaskUpdateWrapper}
                                onDelete={handleTaskDelete}
                            />
                        </div>
                    ) : viewMode === "timeline" ? (
                        <TaskTimelineView
                            tasks={visibleTasks}
                            columns={columns}
                            initialTaskId={initialTaskId}
                            onUpdate={handleTaskUpdateWrapper}
                            onDelete={handleTaskDelete}
                        />
                    ) : null}
                </Suspense>
            </div>

            <Suspense fallback={null}>
                <ManageProjectMembersModal
                    project={project}
                    onUpdate={refetchProject}
                    canManage={canManageProjectMembers}
                    isOpen={isMembersModalOpen}
                    onOpenChange={setIsMembersModalOpen}
                    hideTrigger
                />

                <CreateTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSubmit={handleCreateTask}
                    projects={project ? [project] : []}
                    initialProjectId={projectId}
                    initialStatus={getStatusFromColumn(defaultColumnId, columns)}
                    seededColumnId={defaultColumnId || undefined}
                    projectColumns={columns}
                    lockProjectSelection
                    isSubmitting={createTaskMutation.isPending}
                    assignees={delegateAssignees}
                    teamSlug={teamSlug}
                    teamId={currentTeam?.id || project?.team_id}
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

                {canDeleteProject && (
                    <DeleteProjectModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={handleProjectDelete}
                        project={project}
                    />
                )}
            </Suspense>
        </div>
    );
}

export default function ProjectSlugPage({ params }: { params: Promise<{ teamSlug: string; projectSlug: string }> }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <ProjectSlugPageContent params={params} />
        </Suspense>
    );
}
