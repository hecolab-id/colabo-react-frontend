import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getProjectDetails,
    getProjectBySlugs,
    getProjectDocuments,
    getProjectColumns,
    updateProject,
    createTask,
    updateTask,
    deleteTask,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    deleteProject,
    createProjectDocument,
    deleteProjectDocument
} from "@/lib/api";
import { Task, Column, Project, ProjectDocument } from "@/lib/types";
import { readSnapshot, writeSnapshot } from "@/lib/indexeddb-snapshot";

type ProjectDetailCache = Project & {
    tasks?: Task[];
};

function makeOptimisticId() {
    const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `optimistic-${randomId}`;
}

function persistProjectSnapshot(queryKey: readonly unknown[], project: ProjectDetailCache | undefined) {
    if (!project) {
        return;
    }

    void writeSnapshot(`project:id:${project.id}`, project);

    if (
        queryKey.length === 4 &&
        queryKey[0] === "projects" &&
        queryKey[1] === "detail" &&
        typeof queryKey[2] === "string" &&
        typeof queryKey[3] === "string"
    ) {
        void writeSnapshot(`project:slugs:${queryKey[2]}:${queryKey[3]}`, project);
    }
}

function getProjectDetailCaches(queryClient: ReturnType<typeof useQueryClient>) {
    return queryClient.getQueriesData<ProjectDetailCache>({ queryKey: ["projects", "detail"] });
}

function setProjectDetailCaches(
    queryClient: ReturnType<typeof useQueryClient>,
    updater: (project: ProjectDetailCache | undefined) => ProjectDetailCache | undefined,
) {
    getProjectDetailCaches(queryClient).forEach(([queryKey, project]) => {
        const nextProject = updater(project);
        queryClient.setQueryData<ProjectDetailCache | undefined>(queryKey, nextProject);
        persistProjectSnapshot(queryKey, nextProject);
    });
}

function applyColumnOrder(columns: Column[], orderedIds: string[]) {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));

    return [...columns]
        .sort((left, right) => {
            const leftOrder = orderById.get(left.id);
            const rightOrder = orderById.get(right.id);

            if (leftOrder !== undefined && rightOrder !== undefined) {
                return leftOrder - rightOrder;
            }

            if (leftOrder !== undefined) return -1;
            if (rightOrder !== undefined) return 1;

            return left.order - right.order;
        })
        .map((column, index) => ({ ...column, order: index }));
}

// Keys
export const projectKeys = {
    all: ["projects"] as const,
    detail: (id: string) => [...projectKeys.all, "detail", id] as const,
    detailBySlugs: (teamSlug: string, projectSlug: string) => [...projectKeys.all, "detail", teamSlug, projectSlug] as const,
    columns: (id: string) => [...projectKeys.all, "columns", id] as const,
    documents: (id: string) => [...projectKeys.all, "documents", id] as const,
};

// Hooks
export function useProject(id: string) {
    // If ID looks like a UUID, use ID fetch. If not, this hook shouldn't be used or we need robust check.
    // For now, keeping legacy ID support.
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: async () => {
            const snapshotKey = `project:id:${id}`;
            try {
                const project = await getProjectDetails(id);
                void writeSnapshot(snapshotKey, project);
                return project;
            } catch (error) {
                const snapshot = await readSnapshot<ProjectDetailCache>(snapshotKey);
                if (snapshot) return snapshot;
                throw error;
            }
        },
        enabled: !!id
    });
}

export function useProjectBySlugs(teamSlug: string, projectSlug: string) {
    return useQuery({
        queryKey: projectKeys.detailBySlugs(teamSlug, projectSlug),
        queryFn: async () => {
            const snapshotKey = `project:slugs:${teamSlug}:${projectSlug}`;
            try {
                const project = await getProjectBySlugs(teamSlug, projectSlug);
                void writeSnapshot(snapshotKey, project);
                void writeSnapshot(`project:id:${project.id}`, project);
                return project;
            } catch (error) {
                const snapshot = await readSnapshot<ProjectDetailCache>(snapshotKey);
                if (snapshot) return snapshot;
                throw error;
            }
        },
        enabled: !!teamSlug && !!projectSlug
    });
}

export function useProjectColumns(id: string) {
    return useQuery({
        queryKey: projectKeys.columns(id),
        queryFn: async () => {
            const snapshotKey = `project-columns:${id}`;
            try {
                const columns = await getProjectColumns(id);
                void writeSnapshot(snapshotKey, columns);
                return columns;
            } catch (error) {
                const snapshot = await readSnapshot<Column[]>(snapshotKey);
                if (snapshot) return snapshot;
                throw error;
            }
        },
        enabled: !!id,
    });
}

export function useUpdateProject(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (updates: Partial<Project>) => updateProject(projectId, updates),
        onSuccess: (updatedProject) => {
            setProjectDetailCaches(queryClient, (project) => {
                if (!project || project.id !== projectId) return project;
                return {
                    ...project,
                    ...updatedProject,
                    tasks: project.tasks,
                    members: updatedProject.members ?? project.members,
                };
            });
            queryClient.invalidateQueries({ queryKey: ["projects"], refetchType: "inactive" });
        },
    });
}

export function useProjectDocuments(projectId: string) {
    return useQuery({
        queryKey: projectKeys.documents(projectId),
        queryFn: () => getProjectDocuments(projectId),
        enabled: !!projectId,
    });
}

export function useCreateProjectDocument(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: {
            name: string;
            url: string;
            kind: ProjectDocument["kind"];
            mime_type?: string;
            size_bytes?: number;
        }) => createProjectDocument(projectId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.documents(projectId) });
        },
    });
}

export function useDeleteProjectDocument(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: string) => deleteProjectDocument(projectId, documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.documents(projectId) });
        },
    });
}

// Mutations
export function useCreateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ title, status, columnId, assigneeId }: { title: string; status: string; columnId?: string; assigneeId?: string }) =>
            createTask(projectId, title, status, columnId, undefined, undefined, assigneeId),
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ["projects", "detail"] });
            const previousProjects = getProjectDetailCaches(queryClient);
            const now = new Date().toISOString();
            const optimisticTask: Task = {
                id: makeOptimisticId(),
                project_id: projectId,
                title: variables.title,
                description: "",
                status: variables.status as Task["status"],
                priority: "MEDIUM",
                position: Date.now(),
                assignee_id: variables.assigneeId || null,
                column_id: variables.columnId,
                created_at: now,
                updated_at: now,
                comments_count: 0,
                labels: [],
            };

            setProjectDetailCaches(queryClient, (project) => {
                if (!project || project.id !== projectId) return project;
                return {
                    ...project,
                    task_count: (project.task_count || 0) + 1,
                    tasks: [optimisticTask, ...(project.tasks || [])],
                };
            });

            return { previousProjects, optimisticTaskId: optimisticTask.id };
        },
        onError: (_error, _variables, context) => {
            context?.previousProjects?.forEach(([queryKey, project]) => {
                queryClient.setQueryData(queryKey, project);
            });
        },
        onSuccess: (createdTask, _variables, context) => {
            setProjectDetailCaches(queryClient, (project) => {
                if (!project || project.id !== projectId) return project;
                return {
                    ...project,
                    tasks: (project.tasks || []).map((task) => (
                        task.id === context?.optimisticTaskId ? createdTask : task
                    )),
                };
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["projects", "detail"], refetchType: "inactive" });
        },
    });
}

export function useUpdateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
            updateTask(taskId, updates),
        onMutate: async ({ taskId, updates }) => {
            await queryClient.cancelQueries({ queryKey: ["projects", "detail"] });

            const previousProjects = queryClient.getQueriesData<ProjectDetailCache>({ queryKey: ["projects", "detail"] });

            const applyTaskUpdate = (project: ProjectDetailCache | undefined, nextTask: Partial<Task>) => {
                if (!project || project.id !== projectId) {
                    return project;
                }

                return {
                    ...project,
                    tasks: (project.tasks || []).map((task) => (
                        task.id === taskId
                            ? {
                                ...task,
                                ...nextTask,
                                column_id: nextTask.column_id ?? task.column_id,
                                status: nextTask.status ?? task.status,
                                position: nextTask.position ?? task.position,
                            }
                            : task
                    )),
                };
            };

            previousProjects.forEach(([queryKey, project]) => {
                queryClient.setQueryData<ProjectDetailCache>(queryKey, applyTaskUpdate(project, updates));
            });

            return { previousProjects };
        },
        onError: (_error, _variables, context) => {
            context?.previousProjects?.forEach(([queryKey, project]) => {
                queryClient.setQueryData(queryKey, project);
            });
        },
        onSuccess: (updatedTask) => {
            const cachedProjects = queryClient.getQueriesData<ProjectDetailCache>({ queryKey: ["projects", "detail"] });

            cachedProjects.forEach(([queryKey, project]) => {
                if (!project || project.id !== projectId) {
                    return;
                }

                const nextProject = {
                    ...project,
                    tasks: (project.tasks || []).map((task) => (
                        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                    )),
                };

                queryClient.setQueryData<ProjectDetailCache>(queryKey, nextProject);
                persistProjectSnapshot(queryKey, nextProject);
            });

            queryClient.invalidateQueries({ queryKey: ["projects", "detail"], refetchType: "inactive" });
        },
    });
}

export function useDeleteTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (taskId: string) => deleteTask(taskId),
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: ["projects", "detail"] });
            const previousProjects = getProjectDetailCaches(queryClient);

            setProjectDetailCaches(queryClient, (project) => {
                if (!project || project.id !== projectId) return project;
                const nextTasks = (project.tasks || []).filter((task) => task.id !== taskId);
                return {
                    ...project,
                    task_count: Math.max(0, (project.task_count || nextTasks.length) - 1),
                    completed_count: Math.min(project.completed_count || 0, nextTasks.length),
                    tasks: nextTasks,
                };
            });

            return { previousProjects };
        },
        onError: (_error, _taskId, context) => {
            context?.previousProjects?.forEach(([queryKey, project]) => {
                queryClient.setQueryData(queryKey, project);
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["projects", "detail"], refetchType: "inactive" });
        },
    });
}

export function useCreateColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, color, type }: { name: string; color: string; type?: string }) =>
            createColumn(projectId, name, color, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.columns(projectId) });
        },
    });
}

export function useUpdateColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ columnId, updates }: { columnId: string; updates: Partial<Column> }) =>
            updateColumn(columnId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.columns(projectId) });
        },
    });
}

export function useDeleteColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (columnId: string) => deleteColumn(columnId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.columns(projectId) });
        },
    });
}

export function useReorderColumns(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (columnIds: string[]) => reorderColumns(projectId, columnIds),
        onMutate: async (newOrderIds: string[]) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: projectKeys.columns(projectId) });

            // Snapshot the previous value
            const previousColumns = queryClient.getQueryData<Column[]>(projectKeys.columns(projectId));

            // Optimistically update to the new value
            if (previousColumns) {
                const newColumns = applyColumnOrder(previousColumns, newOrderIds);
                queryClient.setQueryData(projectKeys.columns(projectId), newColumns);
                void writeSnapshot(`project-columns:${projectId}`, newColumns);
            }

            return { previousColumns };
        },
        onError: (err, newOrderIds, context) => {
            // Rollback to the previous value if mutation fails
            if (context?.previousColumns) {
                queryClient.setQueryData(projectKeys.columns(projectId), context.previousColumns);
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: projectKeys.columns(projectId) });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectId: string) => deleteProject(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
    });
}
