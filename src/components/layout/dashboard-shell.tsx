"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { Sidebar } from "./sidebar";
import { BrainSidebar } from "./brain-sidebar";
import { Header } from "./header";
import { Plus, Sparkles } from "lucide-react";
import { MobileBottomNav, MobileNavSheet } from "./mobile-nav";
import { useProject, useProjectBySlugs } from "@/lib/hooks/use-project";
import { AITaskGenerator } from "@/components/modals/ai-task-generator";
import { KeyboardShortcutsModal } from "@/components/modals/keyboard-shortcuts-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { CreateTaskFormValues, CreateTaskModal } from "@/components/modals/create-task-modal";
import { ManageProjectMembersModal } from "@/components/modals/manage-project-members-modal";
import { OfflineRouteGuard } from "@/components/pwa/offline-route-guard";
import { createProject, createTask, getProjects } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useUsage } from "@/lib/hooks/use-billing";
import { Project } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isBrainOpen, setIsBrainOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTaskGeneratorOpen, setIsTaskGeneratorOpen] = useState(false);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [createTaskSuccessMessage, setCreateTaskSuccessMessage] = useState<string | null>(null);
    const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isProjectMembersOpen, setIsProjectMembersOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [teamProjects, setTeamProjects] = useState<Project[]>([]);
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const currentTeam = useStore((state) => state.currentTeam);
    const currentUser = useStore((state) => state.user);

    // Usage Data
    const { data: usage } = useUsage(currentTeam?.id || "");

    // Try to get project from URL params
    const teamSlug = params?.teamSlug as string | undefined;
    const projectSlug = params?.projectSlug as string | undefined;
    const legacyProjectId = params?.id as string | undefined;
    const { data: projectBySlug, refetch: refetchProjectBySlug } = useProjectBySlugs(teamSlug || "", projectSlug || "");
    const { data: projectById, refetch: refetchProjectById } = useProject(legacyProjectId || "");
    const activeProject = projectBySlug ?? projectById;
    const projectId = activeProject?.id;
    const availableGlobalAssignees = currentTeam?.members || [];
    const canManageActiveProjectMembers = !!currentTeam && !!currentUser && (
        currentTeam.owner_id === currentUser.id ||
        ["OWNER", "ADMIN"].includes((currentTeam.role || "").toUpperCase())
    );
    const handleActiveProjectMembersUpdate = async () => {
        if (projectBySlug) {
            await refetchProjectBySlug();
        }
        if (projectById) {
            await refetchProjectById();
        }
        await queryClient.invalidateQueries({ queryKey: ["projects", "detail"] });
    };

    useEffect(() => {
        if (!currentTeam) {
            setTeamProjects([]);
            return;
        }

        getProjects(currentTeam.slug)
            .then((projects) => {
                setTeamProjects(projects || []);
            })
            .catch((error) => {
                console.error("Failed to load projects for quick create", error);
                setTeamProjects([]);
            });
    }, [currentTeam]);

    // Global keyboard shortcut for "?"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for "?" key (Shift + /)
            if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Don't trigger if user is typing in an input/textarea
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                setIsShortcutsModalOpen(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleCreateProject = async (name: string, description: string) => {
        if (!currentTeam) return;

        try {
            // Generate a simple key from name
            const key = name.trim().substring(0, 3).toUpperCase();
            const newProject = await createProject(currentTeam.id, name, key, description);
            setIsProjectModalOpen(false);
            router.push(`/${currentTeam.slug}/${newProject.slug}`);
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    };

    const handleGlobalCreateTask = async ({ title, projectId, status, columnId, assigneeId }: CreateTaskFormValues) => {
        if (!currentTeam) {
            return;
        }

        setIsCreatingTask(true);
        setCreateTaskSuccessMessage(null);

        try {
            await createTask(projectId, title, status, columnId, undefined, undefined, assigneeId);

            await queryClient.invalidateQueries({ queryKey: ["projects", "detail"] });

            if (activeProject?.id === projectId) {
                router.refresh();
            }
            setCreateTaskSuccessMessage("Task created. You can add another one.");
        } catch (error) {
            console.error("Failed to create task", error);
            throw error;
        } finally {
            setIsCreatingTask(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_18%),radial-gradient(circle_at_top_right,rgba(47,111,237,0.08),transparent_24%),linear-gradient(180deg,#fdfefe_0%,#eef3fb_100%)]">
            <OfflineRouteGuard />
            <div className="relative z-40 hidden overflow-visible md:block">
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onOpenProjectModal={() => setIsProjectModalOpen(true)}
                />
            </div>

            <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out">
                <Header
                    projectTitle={activeProject?.name}
                    onOpenProjectMembers={activeProject ? () => setIsProjectMembersOpen(true) : undefined}
                    onOpenCreateTask={() => {
                        setCreateTaskSuccessMessage(null);
                        setIsCreateTaskModalOpen(true);
                    }}
                />
                <div className="flex-1 px-4 pb-28 pt-4 md:p-6 md:pb-6">
                    {children}
                </div>
            </main>

            <MobileNavSheet
                isOpen={isMobileNavOpen}
                onClose={() => setIsMobileNavOpen(false)}
                onOpenProjectModal={() => setIsProjectModalOpen(true)}
            />
            <MobileBottomNav
                isOpen={isMobileNavOpen}
                onOpen={() => setIsMobileNavOpen(true)}
                onClose={() => setIsMobileNavOpen(false)}
            />

            {!isBrainOpen && (
                <button
                    onClick={() => setIsBrainOpen(true)}
                    className="fixed bottom-6 right-6 z-40 hidden rounded-full bg-slate-950 p-3 text-white shadow-[0_18px_36px_rgba(15,23,42,0.22)] transition-all hover:cursor-pointer hover:scale-110 active:scale-95 md:flex"
                    aria-label="Open Project Brain"
                >
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                </button>
            )}

            {currentTeam && (
                <button
                    type="button"
                    onClick={() => {
                        setCreateTaskSuccessMessage(null);
                        setIsCreateTaskModalOpen(true);
                    }}
                    className="fixed bottom-[72px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.22)] transition-all hover:cursor-pointer hover:scale-110 active:scale-95 md:hidden"
                    aria-label="Create task"
                >
                    <Plus className="h-6 w-6" aria-hidden="true" />
                </button>
            )}

            <BrainSidebar
                isOpen={isBrainOpen}
                onClose={() => setIsBrainOpen(false)}
                projectId={projectId}
                onOpenTaskGenerator={() => setIsTaskGeneratorOpen(true)}
            />

            {projectId && (
                <AITaskGenerator
                    isOpen={isTaskGeneratorOpen}
                    onClose={() => setIsTaskGeneratorOpen(false)}
                    projectId={projectId}
                    onTasksCreated={() => {
                        setIsTaskGeneratorOpen(false);
                        // Refresh the page to show new tasks
                        router.refresh();
                    }}
                />
            )}

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                isOpen={isShortcutsModalOpen}
                onClose={() => setIsShortcutsModalOpen(false)}
            />

            {/* Create Project Modal */}
            {currentTeam && (
                <CreateProjectModal
                    isOpen={isProjectModalOpen}
                    onClose={() => setIsProjectModalOpen(false)}
                    onSubmit={handleCreateProject}
                    currentCount={usage?.projects_count}
                    maxCount={usage?.plan?.max_projects}
                />
            )}

            {currentTeam && (
                <CreateTaskModal
                    isOpen={isCreateTaskModalOpen}
                    onClose={() => {
                        setCreateTaskSuccessMessage(null);
                        setIsCreateTaskModalOpen(false);
                    }}
                    onSubmit={handleGlobalCreateTask}
                    projects={teamProjects}
                    initialProjectId={activeProject?.id}
                    initialStatus="TODO"
                    isSubmitting={isCreatingTask}
                    assignees={availableGlobalAssignees}
                    initialAssigneeId={activeProject?.members?.some((member) => member.id === currentUser?.id) ? currentUser?.id : ""}
                    successMessage={createTaskSuccessMessage}
                    resetOnSuccess
                    onCreateProject={() => {
                        setCreateTaskSuccessMessage(null);
                        setIsCreateTaskModalOpen(false);
                        setIsProjectModalOpen(true);
                    }}
                />
            )}

            {activeProject && (
                <ManageProjectMembersModal
                    project={activeProject}
                    onUpdate={handleActiveProjectMembersUpdate}
                    canManage={canManageActiveProjectMembers}
                    isOpen={isProjectMembersOpen}
                    onOpenChange={setIsProjectMembersOpen}
                    hideTrigger
                />
            )}
        </div>
    );
}
