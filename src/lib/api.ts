import axios from "axios";
import { AuthResponse, Plan, Project, ProjectDocument, ProjectDocumentKind, ProjectMeetingNote, WeeklyProjectSummary, Task, Team, Comment, Notification, User, ActivityLog, Column, Checklist, ChecklistItem, Label, Role, TeamUsage, CommentMention, LinkPreview, MessengerConnection, NotificationPreference, MessengerPlatform, TeamMessengerPolicy, MessengerLinkToken, BrowserPushSettings, BrowserPushSubscriptionInput, AdminImpersonationState, AdminOverview, AdminPaymentTransaction, AdminPlan, AdminProjectRow, AdminTeamRow, AdminUserRow, AdminListResponse, AdminAIUsageSummary, AdminAIUsageTeamRow, AdminAIUsageUserRow, AdminAIUsageFeatureRow, AdminAIUsageGranularity, AdminAIUsageTimeseries, DashboardActionBucketId, DashboardActionItem, DashboardActionSeverity, DashboardHealthMetric, DashboardOverview, DashboardProjectSummary, DashboardRecommendedAction, PaginatedResult, TeamActivityItem, TeamActivityOverview, TeamInvite, TeamInvitePreview, EmailReminderPreference, EmailReminderUpdate, AdminEmailReminderSummary, AdminEmailReminderLogRow, AdminEmailReminderRecipientRow } from "./types";
import { recordNotificationPromptIntent } from "@/lib/notification-soft-prompt";

export const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/v1` : "/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
});

const OFFLINE_ACTION_EVENT = "colabo:offline-action-blocked";
const OFFLINE_ACTION_MESSAGE = "This action needs an internet connection. Viewing cached dashboard and task data still works offline.";
export const AUTH_EXPIRED_EVENT = "colabo:auth-expired";

let accessToken: string | null = null;
let refreshTokensPromise: Promise<AuthResponse["tokens"] | null> | null = null;
let hasDispatchedAuthExpired = false;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};

function readStoredAuth() {
    if (typeof window === "undefined") {
        return { accessToken: null as string | null, refreshToken: null as string | null };
    }

    const storage = localStorage.getItem("colabo-store");
    if (!storage) {
        return { accessToken: null as string | null, refreshToken: null as string | null };
    }

    try {
        const parsed = JSON.parse(storage);
        return {
            accessToken: parsed?.state?.accessToken || null,
            refreshToken: parsed?.state?.refreshToken || null,
        };
    } catch {
        return { accessToken: null as string | null, refreshToken: null as string | null };
    }
}

function persistStoredTokens(tokens: AuthResponse["tokens"]) {
    accessToken = tokens.access.token;

    if (typeof window === "undefined") {
        return;
    }

    const storage = localStorage.getItem("colabo-store");
    if (!storage) {
        return;
    }

    try {
        const parsed = JSON.parse(storage);
        const next = {
            ...parsed,
            state: {
                ...parsed.state,
                accessToken: tokens.access.token,
                refreshToken: tokens.refresh.token,
            },
        };
        localStorage.setItem("colabo-store", JSON.stringify(next));
    } catch {
        localStorage.removeItem("colabo-store");
    }
}

function clearStoredAuth() {
    accessToken = null;
    hasDispatchedAuthExpired = true;

    if (typeof window !== "undefined") {
        localStorage.removeItem("colabo-store");
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
}

export const resetAuthExpiredDispatch = () => {
    hasDispatchedAuthExpired = false;
};

async function refreshAuthTokens(refreshToken: string): Promise<AuthResponse["tokens"]> {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-tokens`, {
        refresh_token: refreshToken,
    });

    return data.data.tokens;
}

export class OfflineMutationError extends Error {
    constructor(message = OFFLINE_ACTION_MESSAGE) {
        super(message);
        this.name = "OfflineMutationError";
    }
}

api.interceptors.request.use((config) => {
    const method = (config.method || "get").toUpperCase();

    if (typeof window !== "undefined" && !window.navigator.onLine && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        window.dispatchEvent(new CustomEvent(OFFLINE_ACTION_EVENT, {
            detail: { message: OFFLINE_ACTION_MESSAGE },
        }));
        return Promise.reject(new OfflineMutationError());
    }

    // Priority: In-memory token > LocalStorage
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
    }

    // Dynamically query localStorage to avoid circular dependency with store
    if (typeof window !== "undefined") {
        const storage = localStorage.getItem("colabo-store");
        if (storage) {
            try {
                const { state } = JSON.parse(storage);
                if (state.accessToken) {
                    // Update in-memory for future requests
                    accessToken = state.accessToken;
                    config.headers.Authorization = `Bearer ${state.accessToken}`;
                }
            } catch {
                // Ignore parse error
            }
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        const requestUrl = originalRequest?.url || "";
        const isRefreshRequest = requestUrl.includes("/auth/refresh-tokens");

        if (error.response?.status === 401) {
            const hadToken = originalRequest?.headers?.Authorization;
            const { refreshToken } = readStoredAuth();

            if (hadToken && refreshToken && !originalRequest?._retry && !isRefreshRequest) {
                originalRequest._retry = true;

                try {
                    if (!refreshTokensPromise) {
                        refreshTokensPromise = refreshAuthTokens(refreshToken)
                            .then((tokens) => {
                                persistStoredTokens(tokens);
                                return tokens;
                            })
                            .catch((refreshError) => {
                                clearStoredAuth();
                                throw refreshError;
                            })
                            .finally(() => {
                                refreshTokensPromise = null;
                            });
                    }

                    const nextTokens = await refreshTokensPromise;
                    if (nextTokens?.access?.token) {
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${nextTokens.access.token}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    error = refreshError;
                }
            }

            if ((hadToken || isRefreshRequest) && !hasDispatchedAuthExpired) {
                clearStoredAuth();
            }
        }

        return Promise.reject(error);
    }
);

// Auth
export const performLogin = async (email: string, password: string): Promise<AuthResponse> => {
    try {
        const payload = { email: email.trim(), password: password.trim() };
        console.log("Login Payload:", payload);
        const { data } = await api.post("/auth/login", payload);
        return data.data;
    } catch (error: any) {
        console.error("Login Error:", error.response?.data || error.message);
        throw error;
    }
};

export const performRegister = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data.data;
};

export const forgotPassword = async (email: string): Promise<void> => {
    await api.post("/auth/forgot-password", { email: email.trim() });
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
    await api.post(`/auth/reset-password?token=${token}`, { password });
};

export const getMe = async (): Promise<MeResponse> => {
    const { data } = await api.get("/auth/me");
    return data.data;
};

// Teams
export const getTeams = async (): Promise<Team[]> => {
    // We can get teams from /auth/me or a dedicated /teams endpoint
    // Following previous pattern, let's use /auth/me for now as it aggregates data
    const { data } = await api.get("/auth/me");
    return data.data.teams || [];
};

export const createTeam = async (name: string): Promise<Team> => {
    const { data } = await api.post("/teams", { name });
    return data.data;
};

export const deleteTeam = async (teamId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}`);
};

export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<Team> => {
    const { data } = await api.patch(`/teams/${teamId}`, updates);
    return data.data;
};

export const uploadTeamLogo = async (teamId: string, file: File): Promise<Team> => {
    const { data: presignResponse } = await api.post<{
        data: {
            presignedUrl: string;
            publicUrl: string;
        };
    }>("/upload/presign", {
        filename: file.name,
        fileType: file.type || "application/octet-stream",
    });

    await axios.put(presignResponse.data.presignedUrl, file, {
        headers: {
            "Content-Type": file.type || "application/octet-stream",
        },
    });

    const { data } = await api.patch(`/teams/${teamId}`, {
        logo_url: presignResponse.data.publicUrl,
    });

    return data.data;
};

export const getBillingPlans = async (teamId: string): Promise<Plan[]> => {
    const { data } = await api.get(`/teams/${teamId}/plans`);
    return data.data;
};

export const subscribe = async (teamId: string, planId: string, memberCount: number): Promise<{ xendit_plan_id: string; payment_link_url: string }> => {
    const { data } = await api.post(`/teams/${teamId}/subscribe`, { plan_id: planId, member_count: memberCount });
    return data.data;
};

export const cancelSubscription = async (teamId: string): Promise<void> => {
    await api.post(`/teams/${teamId}/cancel-subscription`);
};

export const getUsage = async (teamId: string): Promise<TeamUsage> => {
    const { data } = await api.get(`/teams/${teamId}/usage`);
    return data.data;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
    const { data } = await api.patch(`/users/${userId}`, updates);
    return data.data;
};

export const getTeamBySlug = async (slug: string): Promise<Team> => {
    const { data } = await api.get(`/teams/${slug}`);
    return data.data;
};

export const getTeamActivities = async (teamSlug: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<TeamActivityItem>> => {
    const { data } = await api.get(`/teams/${teamSlug}/activities`, {
        params: { page, limit },
    });

    return {
        data: data.data || [],
        page: data.page || page,
        limit: data.limit || limit,
        total_pages: data.total_pages || 0,
        total_results: data.total_results || 0,
    };
};

export const getTeamActivityOverview = async (teamSlug: string): Promise<TeamActivityOverview> => {
    const { data } = await api.get(`/teams/${teamSlug}/activity-overview`);
    return data.data;
};
// Members
export const createInvite = async (teamId: string, email: string): Promise<TeamInvite> => {
    const { data } = await api.post(`/teams/${teamId}/invites`, { email });
    return data.data;
};

export const getTeamInvites = async (teamId: string): Promise<TeamInvite[]> => {
    const { data } = await api.get(`/teams/${teamId}/invites`);
    return Array.isArray(data.data) ? data.data : [];
};

export const getInvite = async (code: string): Promise<{ team: Team; inviter: User }> => {
    const { data } = await api.get(`/invites/${code}`);
    return data.data;
};

export const joinTeam = async (code: string): Promise<void> => {
    await api.post(`/invites/${code}/join`);
};

export const acceptTeamInvite = async (token: string): Promise<void> => {
    await api.post(`/invites/team/${token}/accept`);
};

export const getTeamInvitePreview = async (token: string): Promise<TeamInvitePreview> => {
    const { data } = await api.get(`/invites/team/${token}`);
    return data.data;
};

export const removeMember = async (teamId: string, userId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
};

export const leaveTeam = async (teamId: string): Promise<void> => {
    await api.post(`/teams/${teamId}/leave`);
};

export const transferOwnership = async (teamId: string, newOwnerId: string): Promise<void> => {
    await api.post(`/teams/${teamId}/transfer-ownership`, { new_owner_id: newOwnerId });
};

export const updateMemberRole = async (teamId: string, userId: string, roleId: string): Promise<void> => {
    await api.patch(`/teams/${teamId}/members/${userId}`, { role_id: roleId });
};

export const getRoles = async (): Promise<Role[]> => {
    const { data } = await api.get("/roles");
    return data.data;
};

// Projects
// Projects
export const getProjects = async (teamSlug: string): Promise<Project[]> => {
    const { data } = await api.get(`/teams/${teamSlug}/projects`);
    return data.data;
};

export const getProjectDetails = async (projectId: string): Promise<Project & { tasks: Task[] }> => {
    const { data } = await api.get(`/projects/${projectId}`);
    return data.data;
};

export const getProjectBySlugs = async (teamSlug: string, projectSlug: string): Promise<Project & { tasks: Task[] }> => {
    const { data } = await api.get(`/teams/${teamSlug}/projects/${projectSlug}`);
    return data.data;
};

export const createProject = async (teamId: string, name: string, key: string, description?: string, isPrivate: boolean = false): Promise<Project> => {
    const { data } = await api.post("/projects", { team_id: teamId, name, key, description, is_private: isPrivate });
    return data.data;
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const { data } = await api.patch(`/projects/${projectId}`, updates);
    return data.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
};

export const getProjectDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
    const { data } = await api.get(`/projects/${projectId}/documents`);
    return data.data;
};

export const createProjectDocument = async (
    projectId: string,
    payload: {
        name: string;
        url: string;
        kind: ProjectDocumentKind;
        mime_type?: string;
        size_bytes?: number;
    },
): Promise<ProjectDocument> => {
    const { data } = await api.post(`/projects/${projectId}/documents`, payload);
    return data.data;
};

export const deleteProjectDocument = async (projectId: string, documentId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/documents/${documentId}`);
};

export const getProjectMeetingNotes = async (projectId: string): Promise<ProjectMeetingNote[]> => {
    const { data } = await api.get(`/projects/${projectId}/meeting-notes`);
    return data.data;
};

export const createProjectMeetingNote = async (
    projectId: string,
    payload: {
        meeting_at: string;
        content: string;
    },
): Promise<ProjectMeetingNote> => {
    const { data } = await api.post(`/projects/${projectId}/meeting-notes`, payload);
    return data.data;
};

export const updateProjectMeetingNote = async (
    projectId: string,
    noteId: string,
    payload: {
        meeting_at: string;
        content: string;
    },
): Promise<ProjectMeetingNote> => {
    const { data } = await api.patch(`/projects/${projectId}/meeting-notes/${noteId}`, payload);
    return data.data;
};

export const deleteProjectMeetingNote = async (projectId: string, noteId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/meeting-notes/${noteId}`);
};

export const getProjectWeeklySummaries = async (projectId: string): Promise<WeeklyProjectSummary[]> => {
    const { data } = await api.get(`/projects/${projectId}/weekly-summaries`);
    return data.data;
};

export const generateProjectWeeklySummary = async (projectId: string): Promise<WeeklyProjectSummary> => {
    const { data } = await api.post(`/projects/${projectId}/weekly-summaries/generate`);
    return data.data;
};

export const downloadProjectWeeklySummaryPdf = async (projectId: string, summaryId: string): Promise<Blob> => {
    const { data } = await api.get(`/projects/${projectId}/weekly-summaries/${summaryId}/pdf`, {
        responseType: "blob",
    });
    return data;
};

export const inviteProjectMember = async (projectId: string, payload: { user_id?: string; email?: string }): Promise<void> => {
    await api.post(`/projects/${projectId}/members`, payload);
};

export const getProjectInvites = async (projectId: string): Promise<any[]> => {
    const { data } = await api.get(`/projects/${projectId}/invites`);
    return data.data;
};

export const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
};

export const acceptProjectInvite = async (token: string): Promise<void> => {
    await api.post(`/invites/project/${token}/accept`);
};

// Tasks
export const getTask = async (taskId: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data.data;
};

export const getMyTasks = async (): Promise<Task[]> => {
    const { data } = await api.get("/tasks/my");
    return data.data;
};

const DASHBOARD_BUCKET_ORDER: DashboardActionBucketId[] = [
    "needs_attention",
    "due_soon",
    "blocked",
    "ready_to_resume",
];

function isTaskDone(task: Task) {
    return task.status === "DONE" || task.column?.type === "done";
}

function asArray<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

function toTaskHref(task: Task) {
    if (task.project?.team?.slug && task.project?.slug) {
        return `/${task.project.team.slug}/${task.project.slug}`;
    }

    return "/my-tasks";
}

function getTaskStatusLabel(task: Task) {
    return task.column?.name || task.status.replaceAll("_", " ");
}

function getTaskReason(task: Task, bucket: DashboardActionBucketId, now: Date) {
    if (bucket === "needs_attention" && task.due_date) {
        const overdueDays = Math.max(1, Math.ceil((now.getTime() - new Date(task.due_date).getTime()) / 86400000));
        return overdueDays === 1 ? "Past due since yesterday" : `Past due by ${overdueDays} days`;
    }

    if (bucket === "due_soon" && task.due_date) {
        const dueInDays = Math.max(0, Math.ceil((new Date(task.due_date).getTime() - now.getTime()) / 86400000));
        if (dueInDays <= 1) {
            return "Due within the next 24 hours";
        }
        return `Due within ${dueInDays} days`;
    }

    if (bucket === "blocked") {
        return "No recent movement, so it may need intervention";
    }

    return task.project?.name
        ? `Active in ${task.project.name}`
        : "Ready to resume when you are";
}

function toDashboardActionItem(task: Task, bucket: DashboardActionBucketId, severity: DashboardActionSeverity, now: Date): DashboardActionItem {
    return {
        id: task.id,
        title: task.title,
        href: toTaskHref(task),
        bucket,
        severity,
        reason: getTaskReason(task, bucket, now),
        projectName: task.project?.name,
        projectCode: task.project?.key,
        statusLabel: getTaskStatusLabel(task),
        dueAt: task.due_date,
    };
}

function buildFallbackRecommendedAction(actionBuckets: DashboardOverview["actionBuckets"], workspaceName: string): DashboardRecommendedAction {
    for (const bucket of DASHBOARD_BUCKET_ORDER) {
        const candidate = actionBuckets[bucket][0];
        if (!candidate) {
            continue;
        }

        const ctaLabel = bucket === "ready_to_resume" ? "Resume Task" : "Open Task";
        return {
            title: candidate.title,
            description: candidate.projectName
                ? `Step into ${candidate.projectName} and resolve the highest-priority item first.`
                : `Open the task and keep ${workspaceName} moving.`,
            reason: candidate.reason,
            href: candidate.href,
            ctaLabel,
            severity: candidate.severity,
        };
    }

    return {
        title: "No urgent interventions right now",
        description: `Your queue looks clear in ${workspaceName}. Use this moment to resume a project or start something new.`,
        reason: "Everything critical is under control",
        href: "/my-tasks",
        ctaLabel: "Review Task List",
        severity: "stable",
    };
}

function buildFallbackHealthMetrics(tasks: Task[], projects: Project[], usage?: TeamUsage): DashboardHealthMetric[] {
    const safeTasks = asArray(tasks);
    const safeProjects = asArray(projects);
    const openTasks = safeTasks.filter((task) => !isTaskDone(task));
    const completedTasks = safeTasks.length - openTasks.length;
    const overdueCount = openTasks.filter((task) => task.due_date && new Date(task.due_date) < new Date()).length;
    const dueSoonCount = openTasks.filter((task) => {
        if (!task.due_date) {
            return false;
        }

        const dueAt = new Date(task.due_date).getTime();
        const now = Date.now();
        return dueAt >= now && dueAt <= now + 3 * 86400000;
    }).length;
    const completionRate = safeTasks.length > 0 ? Math.round((completedTasks / safeTasks.length) * 100) : 0;
    const activeProjects = safeProjects.filter((project) => project.task_count > project.completed_count).length;
    const capacityPercent = usage?.plan?.max_projects
        ? Math.min(100, Math.round((usage.projects_count / Math.max(usage.plan.max_projects, 1)) * 100))
        : 0;

    return [
        {
            id: "urgent-load",
            label: "Urgent Load",
            value: overdueCount + dueSoonCount,
            tone: overdueCount > 0 ? "critical" : dueSoonCount > 0 ? "warning" : "stable",
            context: overdueCount > 0
                ? `${overdueCount} overdue and ${dueSoonCount} due soon`
                : dueSoonCount > 0
                    ? `${dueSoonCount} task${dueSoonCount === 1 ? "" : "s"} landing soon`
                    : "No urgent task pressure right now",
        },
        {
            id: "completion-rate",
            label: "Completion",
            value: completionRate,
            suffix: "%",
            tone: completionRate >= 70 ? "stable" : completionRate >= 40 ? "warning" : "neutral",
            context: tasks.length > 0
                ? `${completedTasks} of ${tasks.length} assigned tasks completed`
                : "No assigned tasks yet",
        },
        {
            id: "project-capacity",
            label: "Project Capacity",
            value: usage?.projects_count ?? projects.length,
            tone: capacityPercent >= 90 ? "warning" : "neutral",
            context: usage?.plan?.max_projects
                ? `${usage.projects_count} of ${usage.plan.max_projects} project slots in use`
                : `${projects.length} project${projects.length === 1 ? "" : "s"} in this workspace`,
        },
        {
            id: "projects-in-motion",
            label: "Projects in Motion",
            value: activeProjects,
            tone: activeProjects > 0 ? "stable" : "neutral",
            context: activeProjects > 0
                ? `${activeProjects} project${activeProjects === 1 ? "" : "s"} still have open work`
                : "No active project work detected",
        },
    ];
}

function buildFallbackProjectSummaries(projects: Project[], teamSlug?: string): DashboardProjectSummary[] {
    return projects.slice(0, 4).map((project) => {
        const activeTaskCount = Math.max(project.task_count - project.completed_count, 0);
        const completionRate = project.task_count > 0
            ? Math.min(100, Math.round((project.completed_count / project.task_count) * 100))
            : 0;

        let note = "Fresh space for new work";
        if (activeTaskCount > 0 && completionRate < 40) {
            note = "Plenty still in motion";
        } else if (activeTaskCount > 0) {
            note = "Good momentum with active work";
        } else if (project.task_count > 0) {
            note = "Everything currently wrapped";
        }

        return {
            id: project.id,
            name: project.name,
            key: project.key,
            href: teamSlug ? `/${teamSlug}/${project.slug}` : "/dashboard",
            taskCount: project.task_count,
            completedCount: project.completed_count,
            activeTaskCount,
            completionRate,
            note,
            createdAt: project.created_at,
        };
    });
}

async function buildDashboardOverviewFallback(teamSlug?: string, teamId?: string): Promise<DashboardOverview> {
    const [tasksResult, projectsResult, usageResult] = await Promise.allSettled([
        getMyTasks(),
        teamSlug ? getProjects(teamSlug) : Promise.resolve([] as Project[]),
        teamId ? getUsage(teamId) : Promise.resolve(undefined),
    ]);

    const tasks = tasksResult.status === "fulfilled" ? asArray(tasksResult.value) : [];
    const projects = projectsResult.status === "fulfilled" ? asArray(projectsResult.value) : [];
    const usage = usageResult.status === "fulfilled" ? usageResult.value : undefined;
    const now = new Date();
    const threeDaysFromNow = now.getTime() + 3 * 86400000;
    const fiveDaysAgo = now.getTime() - 5 * 86400000;
    const openTasks = tasks.filter((task) => !isTaskDone(task));

    const overdueTasks = openTasks
        .filter((task) => task.due_date && new Date(task.due_date).getTime() < now.getTime())
        .sort((left, right) => new Date(left.due_date || 0).getTime() - new Date(right.due_date || 0).getTime());

    const overdueIds = new Set(overdueTasks.map((task) => task.id));

    const dueSoonTasks = openTasks
        .filter((task) => {
            if (!task.due_date || overdueIds.has(task.id)) {
                return false;
            }

            const dueAt = new Date(task.due_date).getTime();
            return dueAt >= now.getTime() && dueAt <= threeDaysFromNow;
        })
        .sort((left, right) => new Date(left.due_date || 0).getTime() - new Date(right.due_date || 0).getTime());

    const reservedIds = new Set([...overdueIds, ...dueSoonTasks.map((task) => task.id)]);

    const stalledTasks = openTasks
        .filter((task) => {
            if (reservedIds.has(task.id)) {
                return false;
            }

            const updatedAt = new Date(task.updated_at).getTime();
            return updatedAt <= fiveDaysAgo;
        })
        .sort((left, right) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime());

    stalledTasks.forEach((task) => reservedIds.add(task.id));

    const readyToResumeTasks = openTasks
        .filter((task) => !reservedIds.has(task.id))
        .sort((left, right) => {
            const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
            const leftRank = priorityRank[left.priority] ?? 2;
            const rightRank = priorityRank[right.priority] ?? 2;

            if (leftRank !== rightRank) {
                return leftRank - rightRank;
            }

            return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        });

    const actionBuckets: DashboardOverview["actionBuckets"] = {
        needs_attention: overdueTasks.slice(0, 3).map((task) => toDashboardActionItem(task, "needs_attention", "critical", now)),
        due_soon: dueSoonTasks.slice(0, 3).map((task) => toDashboardActionItem(task, "due_soon", "warning", now)),
        blocked: stalledTasks.slice(0, 3).map((task) => toDashboardActionItem(task, "blocked", "warning", now)),
        ready_to_resume: readyToResumeTasks.slice(0, 3).map((task) => toDashboardActionItem(task, "ready_to_resume", "stable", now)),
    };

    const workspaceName = teamSlug || "your workspace";

    return {
        workspace: {
            teamId,
            teamName: workspaceName,
            teamSlug,
            teamCount: 0,
            isOwner: false,
        },
        recommendedAction: buildFallbackRecommendedAction(actionBuckets, workspaceName),
        actionBuckets,
        healthMetrics: buildFallbackHealthMetrics(tasks, projects, usage),
        projects: buildFallbackProjectSummaries(projects, teamSlug),
        utility: {
            showUpgrade: !!usage?.plan?.max_projects && usage.projects_count >= Math.max(usage.plan.max_projects - 1, 1),
            upgradeHref: teamSlug ? `/${teamSlug}/settings?plans=1` : undefined,
            planName: usage?.plan?.name,
            projectsUsed: usage?.projects_count,
            projectsLimit: usage?.plan?.max_projects,
            membersUsed: usage?.members_count,
            membersLimit: usage?.plan?.max_members,
        },
    };
}

export const getDashboardOverview = async (teamSlug?: string, teamId?: string): Promise<DashboardOverview> => {
    return buildDashboardOverviewFallback(teamSlug, teamId);
};

export const createTask = async (
    projectId: string,
    title: string,
    status: string = "TODO",
    columnId?: string,
    description?: string,
    priority?: string,
    assigneeId?: string,
    dueDate?: string | null,
    startDate?: string | null,
): Promise<Task> => {
    const { data } = await api.post("/tasks", {
        project_id: projectId,
        title,
        status,
        column_id: columnId,
        description,
        priority,
        assignee_id: assigneeId,
        due_date: dueDate || undefined,
        start_date: startDate || undefined,
    });
    recordNotificationPromptIntent("task_created");
    return data.data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${taskId}`, updates);
    return data.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
};

export type RefineTitleResult = {
    refined: string;
    changed: boolean;
};

export const getWeeklyTaskReminderPreference = async (): Promise<EmailReminderPreference> => {
    const { data } = await api.get<{ data: EmailReminderPreference }>("/users/me/email-reminders/weekly-task");
    return data.data;
};

export const updateWeeklyTaskReminderPreference = async (input: EmailReminderUpdate): Promise<EmailReminderPreference> => {
    const { data } = await api.patch<{ data: EmailReminderPreference }>(
        "/users/me/email-reminders/weekly-task",
        input,
    );
    return data.data;
};

// Token-based unsubscribe is intentionally unauthenticated; the token is
// the secret. We bypass the shared axios instance (which would attach the
// caller's JWT) so logged-out recipients on a different account can still
// call it from the email link.
export const unsubscribeFromEmailReminder = async (token: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/email-reminders/unsubscribe`, { token });
};

export const refineTaskTitle = async (title: string, teamId: string): Promise<RefineTitleResult> => {
    const { data } = await api.post("/ai/refine-title", {
        title,
        team_id: teamId,
    });
    return data;
};

// Comments
export const getComments = async (taskId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/tasks/${taskId}/comments`);
    // The backend returns a paginated response inside data.data (wrapped in Response)
    // and the array is in data.data.data (PaginatedResponse.Data with json:"data")
    return data.data?.data || [];
};

type CreateCommentPayload = {
    content: string;
    mentions?: Array<Pick<CommentMention, "user_id" | "display_text" | "start" | "end">>;
};

const normalizeNotification = (notification: any): Notification => ({
    id: notification.id,
    user_id: notification.user_id,
    title: notification.title,
    content: notification.content ?? notification.message ?? "",
    read_at: notification.read_at ?? (notification.is_read ? notification.updated_at || notification.created_at : undefined),
    created_at: notification.created_at,
    type: typeof notification.type === "string" ? notification.type.toLowerCase() : notification.type,
    resource_id: notification.resource_id,
    data: notification.data,
    link: notification.link,
});

export const addComment = async (taskId: string, payload: CreateCommentPayload): Promise<Comment> => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { task_id: taskId, ...payload });
    return data.data;
};

export const getLinkPreview = async (url: string, signal?: AbortSignal): Promise<LinkPreview> => {
    const { data } = await api.get("/link-preview", {
        params: { url },
        signal,
    });
    return data.data;
};

export const getTaskActivities = async (taskId: string): Promise<ActivityLog[]> => {
    const { data } = await api.get(`/tasks/${taskId}/activities`);
    return data.data || [];
};


// Notifications
export const getNotifications = async (): Promise<Notification[]> => {
    const { data } = await api.get("/notifications");
    return (data.data || []).map(normalizeNotification);
};

export const getBrowserPushSettings = async (): Promise<BrowserPushSettings> => {
    const { data } = await api.get("/notifications/push-settings");
    return data.data;
};

export const updateBrowserPushSettings = async (payload: { is_enabled: boolean }): Promise<BrowserPushSettings> => {
    const { data } = await api.put("/notifications/push-settings", payload);
    return data.data;
};

export const saveBrowserPushSubscription = async (payload: BrowserPushSubscriptionInput): Promise<void> => {
    await api.post("/notifications/push-subscriptions", payload);
};

export const sendBrowserPushTest = async (): Promise<void> => {
    await api.post("/notifications/push-test");
};

export const deleteBrowserPushSubscription = async (endpoint: string): Promise<void> => {
    await api.delete("/notifications/push-subscriptions", {
        data: { endpoint },
    });
};

export const getMessengerConnections = async (): Promise<MessengerConnection[]> => {
    const { data } = await api.get("/messenger/connections/me");
    return data.data || [];
};

export const connectMessengerPlatform = async (
    platform: MessengerPlatform,
    payload: Partial<MessengerConnection>
): Promise<MessengerConnection> => {
    const { data } = await api.post(`/messenger/connect/${platform.toLowerCase()}`, payload);
    return data.data;
};

export const createMessengerLinkToken = async (platform: MessengerPlatform): Promise<MessengerLinkToken> => {
    const { data } = await api.post(`/messenger/connect/${platform.toLowerCase()}/code`);
    return data.data;
};

export const disconnectMessengerPlatform = async (platform: MessengerPlatform): Promise<void> => {
    await api.delete(`/messenger/connect/${platform.toLowerCase()}`);
};

export const getMessengerPreference = async (platform: MessengerPlatform): Promise<NotificationPreference> => {
    const { data } = await api.get(`/messenger/preferences/me?platform=${platform}`);
    return data.data;
};

export const updateMessengerPreference = async (
    platform: MessengerPlatform,
    payload: Partial<NotificationPreference>
): Promise<NotificationPreference> => {
    const { data } = await api.put(`/messenger/preferences/me?platform=${platform}`, payload);
    return data.data;
};

export const getTeamMessengerPolicy = async (teamId: string): Promise<TeamMessengerPolicy> => {
    const { data } = await api.get(`/teams/${teamId}/messenger-policy`);
    return data.data;
};

export const updateTeamMessengerPolicy = async (
    teamId: string,
    payload: Partial<TeamMessengerPolicy>
): Promise<TeamMessengerPolicy> => {
    const { data } = await api.put(`/teams/${teamId}/messenger-policy`, payload);
    return data.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
    const { data } = await api.get("/notifications/unread-count");
    return data.data;
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
    await api.patch(`/notifications/read-all`);
};

export const sendVerificationEmail = async (): Promise<void> => {
    await api.post("/auth/send-verification-email");
};

export const verifyEmail = async (token: string): Promise<void> => {
    await api.post(`/auth/verify-email?token=${token}`);
};

// Columns
export const getProjectColumns = async (projectId: string): Promise<Column[]> => {
    const { data } = await api.get(`/projects/${projectId}/columns`);
    return data.data;
};

export const createColumn = async (projectId: string, name: string, color?: string, type?: string): Promise<Column> => {
    const { data } = await api.post(`/projects/${projectId}/columns`, { name, color, type });
    return data.data;
};

export const updateColumn = async (columnId: string, updates: Partial<Column>): Promise<Column> => {
    const { data } = await api.patch(`/columns/${columnId}`, updates);
    return data.data;
};

export const deleteColumn = async (columnId: string, destinationColumnId?: string): Promise<void> => {
    await api.delete(`/columns/${columnId}`, {
        data: destinationColumnId ? { destination_column_id: destinationColumnId } : undefined,
    });
};

export const reorderColumns = async (projectId: string, columnIds: string[]): Promise<void> => {
    await api.patch(`/projects/${projectId}/columns/reorder`, { column_ids: columnIds });
};

// Checklists
export const getChecklists = async (taskId: string): Promise<Checklist[]> => {
    const { data } = await api.get(`/tasks/${taskId}/checklists`);
    return data.data;
};

export const createChecklist = async (taskId: string, title: string): Promise<Checklist> => {
    const { data } = await api.post(`/tasks/${taskId}/checklists`, { title });
    return data.data;
};

export const deleteChecklist = async (checklistId: string): Promise<void> => {
    await api.delete(`/checklists/${checklistId}`);
};

export const createChecklistItem = async (checklistId: string, content: string): Promise<ChecklistItem> => {
    const { data } = await api.post(`/checklists/${checklistId}/items`, { content });
    return data.data;
};

export const updateChecklistItem = async (itemId: string, updates: Partial<ChecklistItem>): Promise<ChecklistItem> => {
    const { data } = await api.patch(`/checklist-items/${itemId}`, updates);
    return data.data;
};

export const deleteChecklistItem = async (itemId: string): Promise<void> => {
    await api.delete(`/checklist-items/${itemId}`);
};

export type MeResponse = {
    user: User;
    teams: Team[];
    impersonation?: AdminImpersonationState;
};

type AdminListQuery = {
    q?: string;
    page?: number;
    page_size?: number;
    status?: string;
};

const buildAdminListParams = (query?: AdminListQuery) => {
    const params = new URLSearchParams();
    if (!query) return params;
    if (query.q) params.set("q", query.q);
    if (query.page) params.set("page", String(query.page));
    if (query.page_size) params.set("page_size", String(query.page_size));
    if (query.status) params.set("status", query.status);
    return params;
};

// Admin Mode
export const getAdminDashboard = async (signal?: AbortSignal): Promise<AdminOverview> => {
    const { data } = await api.get("/admin/overview", { signal });
    return data.data;
};

export const getAdminTeams = async (
    query?: AdminListQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminTeamRow>> => {
    const { data } = await api.get(`/admin/teams?${buildAdminListParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminProjects = async (signal?: AbortSignal): Promise<AdminProjectRow[]> => {
    const { data } = await api.get("/admin/projects", { signal });
    return data.data || [];
};

export const getAdminUsers = async (
    query?: AdminListQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminUserRow>> => {
    const { data } = await api.get(`/admin/users?${buildAdminListParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminPayments = async (
    query?: AdminListQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminPaymentTransaction>> => {
    const { data } = await api.get(`/admin/payments?${buildAdminListParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminPlans = async (
    query?: AdminListQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminPlan>> => {
    const { data } = await api.get(`/admin/plans?${buildAdminListParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

// AI Usage Report (Phase 3 of AI Usage Report feature).
//
// AdminAIUsageQuery extends AdminListQuery with time-range and team-filter
// parameters. The backend default range is 30 days ending in Asia/Jakarta
// time when from/to are omitted.

type AdminAIUsageQuery = AdminListQuery & {
    from?: string;     // ISO 8601
    to?: string;       // ISO 8601
    team_id?: string;
    granularity?: AdminAIUsageGranularity;
};

const buildAIUsageParams = (query?: AdminAIUsageQuery) => {
    const params = buildAdminListParams(query);
    if (!query) return params;
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.team_id) params.set("team_id", query.team_id);
    if (query.granularity) params.set("granularity", query.granularity);
    return params;
};

export const getAdminAIUsageSummary = async (
    query?: AdminAIUsageQuery,
    signal?: AbortSignal,
): Promise<AdminAIUsageSummary> => {
    const { data } = await api.get(`/admin/ai-usage/summary?${buildAIUsageParams(query).toString()}`, { signal });
    return data.data;
};

export const getAdminAIUsageByTeam = async (
    query?: AdminAIUsageQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminAIUsageTeamRow>> => {
    const { data } = await api.get(`/admin/ai-usage/teams?${buildAIUsageParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminAIUsageByUser = async (
    query?: AdminAIUsageQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminAIUsageUserRow>> => {
    const { data } = await api.get(`/admin/ai-usage/users?${buildAIUsageParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminAIUsageByFeature = async (
    query?: AdminAIUsageQuery,
    signal?: AbortSignal,
): Promise<AdminAIUsageFeatureRow[]> => {
    const { data } = await api.get(`/admin/ai-usage/features?${buildAIUsageParams(query).toString()}`, { signal });
    return data.data || [];
};

export const getAdminAIUsageTimeseries = async (
    query?: AdminAIUsageQuery,
    signal?: AbortSignal,
): Promise<AdminAIUsageTimeseries> => {
    const { data } = await api.get(`/admin/ai-usage/timeseries?${buildAIUsageParams(query).toString()}`, { signal });
    return data.data || { granularity: "day", points: [], from: "", to: "" };
};

// Weekly task reminder admin dashboard.

type AdminEmailReminderQuery = AdminListQuery & {
    state?: string;
};

const buildEmailReminderParams = (query?: AdminEmailReminderQuery) => {
    const params = buildAdminListParams(query);
    if (query?.state) params.set("state", query.state);
    return params;
};

export const getAdminEmailReminderSummary = async (
    signal?: AbortSignal,
): Promise<AdminEmailReminderSummary> => {
    const { data } = await api.get("/admin/email-reminders/summary", { signal });
    return data.data;
};

export const getAdminEmailReminderLogs = async (
    query?: AdminListQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminEmailReminderLogRow>> => {
    const { data } = await api.get(`/admin/email-reminders/logs?${buildAdminListParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const getAdminEmailReminderRecipients = async (
    query?: AdminEmailReminderQuery,
    signal?: AbortSignal,
): Promise<AdminListResponse<AdminEmailReminderRecipientRow>> => {
    const { data } = await api.get(`/admin/email-reminders/recipients?${buildEmailReminderParams(query).toString()}`, { signal });
    return data.data || { items: [], meta: { total: 0, page: 1, page_size: query?.page_size || 12 } };
};

export const impersonateUser = async (userId: string): Promise<{ user: User; tokens: AuthResponse["tokens"]; impersonation?: AdminImpersonationState }> => {
    const { data } = await api.post("/admin/impersonations", { user_id: userId });
    return data.data;
};

export const exitImpersonation = async (): Promise<{ user: User; tokens: AuthResponse["tokens"]; impersonation?: AdminImpersonationState }> => {
    const { data } = await api.post("/admin/impersonations/exit");
    return data.data;
};

export const updateAdminTeamSubscription = async (teamId: string, payload: { status: string; plan_id?: string; current_period_end?: string | null }) => {
    const { data } = await api.patch(`/admin/teams/${teamId}/subscription`, payload);
    return data.data;
};

export const createAdminPlan = async (payload: Omit<AdminPlan, "id" | "created_at">) => {
    const { data } = await api.post("/admin/plans", payload);
    return data.data;
};

export const updateAdminPlan = async (planId: string, payload: Omit<AdminPlan, "id" | "created_at">) => {
    const { data } = await api.patch(`/admin/plans/${planId}`, payload);
    return data.data;
};

export const deleteAdminPlan = async (planId: string) => {
    await api.delete(`/admin/plans/${planId}`);
};

// AI Chat
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatStreamChunk {
    content: string;
    done: boolean;
}

// Label API functions
export const getTeamLabels = async (teamSlug: string): Promise<Label[]> => {
    const response = await api.get(`/teams/${teamSlug}/labels`);
    // Backend (pre-fix) serialized empty Go slices as null. The frontend
    // assumes Label[]; coerce any non-array response to [] so callers
    // never see undefined.filter at runtime.
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
};

export const createLabel = async (teamSlug: string, name: string, color: string) => {
    const response = await api.post(`/teams/${teamSlug}/labels`, { name, color });
    return response.data.data;
};

export const updateLabel = async (labelId: string, data: { name?: string; color?: string }) => {
    const response = await api.patch(`/labels/${labelId}`, data);
    return response.data.data;
};

export const deleteLabel = async (labelId: string) => {
    await api.delete(`/labels/${labelId}`);
};

export const addLabelToTask = async (taskId: string, labelId: string) => {
    await api.post(`/tasks/${taskId}/labels/${labelId}`);
};

export const removeLabelFromTask = async (taskId: string, labelId: string) => {
    await api.delete(`/tasks/${taskId}/labels/${labelId}`);
};

export interface GeneratedTask {
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    column_name?: string;
    start_date?: string;
    due_date?: string;
}

export interface GenerateTasksResponse {
    tasks: GeneratedTask[];
    message: string;
}

export const generateTasksWithAI = async (
    projectId: string,
    prompt: string,
    count?: number,
    withTimeline?: boolean,
    timelineStart?: string
): Promise<GenerateTasksResponse> => {
    const response = await api.post<GenerateTasksResponse>("/ai/generate-tasks", {
        project_id: projectId,
        prompt: prompt,
        count: count || 5,
        with_timeline: withTimeline ?? false,
        timeline_start: timelineStart || undefined,
    });
    return response.data;
};

export const uploadFile = async (file: File): Promise<{ url: string; key: string }> => {
    // Upload file through backend API (bypasses CORS issues with R2)
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<{ data: { url: string } }>("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return { url: data.data.url, key: data.data.url };
};

export const streamAIChat = async (
    projectId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    signal?: AbortSignal,
): Promise<void> => {
    try {
        // Get access token
        let token = accessToken;
        if (!token && typeof window !== "undefined") {
            const storage = localStorage.getItem("colabo-store");
            if (storage) {
                const { state } = JSON.parse(storage);
                token = state.accessToken;
            }
        }

        if (!token) {
            onError("Authentication required");
            return;
        }

        const response = await fetch(`/v1/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                project_id: projectId,
                message: message,
            }),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json();
            onError(errorData.error || "Failed to connect to AI");
            return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            onError("Failed to read response stream");
            return;
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const jsonStr = line.slice(6); // Remove "data: " prefix
                        const parsed: ChatStreamChunk = JSON.parse(jsonStr);

                        if (parsed.done) {
                            onComplete();
                            return;
                        }

                        if (parsed.content) {
                            onChunk(parsed.content);
                        }
                    } catch (e) {
                        // Skip malformed JSON
                        console.warn("Failed to parse SSE chunk:", e);
                    }
                }
            }
        }

        onComplete();
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            // Caller-initiated abort. Caller handles UI state via the
            // controller it owns, so we don't surface a synthetic error.
            return;
        }
        console.error("AI chat error:", error);
        onError(error instanceof Error ? error.message : "Unknown error");
    }
};
