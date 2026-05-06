"use client";

import { useEffect, useMemo, useState } from "react";
import { getProjects, createProject, deleteProject, getTeamBySlug } from "@/lib/api";
import {
    ChevronRight,
    FolderKanban,
    Plus,
    Search,
    Sparkles,
    Users,
} from "lucide-react";
import Link from "@/components/app-link";
import { useParams } from "@/lib/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { DeleteProjectModal } from "@/components/modals/delete-project-modal";
import { ProjectCard } from "@/components/project-card";
import { Project, Team } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useUsage } from "@/lib/hooks/use-billing";

const numberFormatter = new Intl.NumberFormat();

export default function TeamDashboardPage() {
    const params = useParams<{ teamSlug: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    const setCurrentTeam = useStore((state) => state.setTeam);
    const currentUser = useStore((state) => state.user);
    const { data: usage } = useUsage(team?.id || "");

    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                const teamData = await getTeamBySlug(params.teamSlug);
                setTeam(teamData);
                setCurrentTeam(teamData);

                const projectList = await getProjects(params.teamSlug);
                setProjects(projectList || []);
            } catch (error) {
                console.error("Failed to load team data:", error);
                if ([403, 404].includes((error as { response?: { status?: number } })?.response?.status || 0)) {
                    setTeam(null);
                    setProjects([]);
                }
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [params.teamSlug, setCurrentTeam]);

    const handleCreateProject = async (name: string, key: string, description: string, isPrivate: boolean) => {
        if (!team) return;

        try {
            const newProject = await createProject(team.id, name, key, description, isPrivate);
            setProjects((currentProjects) => [newProject, ...currentProjects]);
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const filteredProjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return projects;

        return projects.filter((project) =>
            project.name.toLowerCase().includes(query) ||
            project.key.toLowerCase().includes(query)
        );
    }, [projects, searchQuery]);

    const totalTasks = projects.reduce((count, project) => count + (project.task_count || 0), 0);
    const canDeleteProject = !!team && !!currentUser && (
        team.owner_id === currentUser.id ||
        ["OWNER", "ADMIN"].includes((team.role || "").toUpperCase())
    );

    const handleDeleteProject = async (projectId: string) => {
        await deleteProject(projectId);
        setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
        setProjectToDelete(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-muted-foreground">Loading team workspace…</div>
            </div>
        );
    }

    if (!team) {
        return (
            <section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                <div className="max-w-xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        Workspace Missing
                    </div>
                    <div>
                        <h1 className="font-space-grotesk text-3xl font-semibold text-slate-900 tracking-tight text-balance">Team not found</h1>
                        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                            The team “{params.teamSlug}” does not exist, or this account does not have access to it.
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="transition hover:text-foreground">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">{team.name}</span>
            </div>

            <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-slate-50 p-6 md:p-8">
                <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_360px]">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 text-slate-900" aria-hidden="true" />
                            Team Project Hub
                        </div>

                        <div className="space-y-3">
                            <h1 className="max-w-3xl font-space-grotesk text-4xl font-semibold tracking-tight text-slate-900 text-balance md:text-5xl">
                                Projects in {team.name}
                            </h1>
                            <p className="max-w-2xl text-[15px] leading-relaxed text-slate-500 md:text-base">
                                This is the shared project index for the current workspace. Use it to scan active work,
                                jump into existing boards, or start something new.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 pt-2">
                            <div className="rounded-[24px] bg-white border border-black/5 p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Projects</span>
                                    <FolderKanban className="h-[18px] w-[18px] text-slate-300" aria-hidden="true" />
                                </div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">{numberFormatter.format(projects.length)}</div>
                                <p className="mt-1 text-[13px] text-slate-500">Total boards in this workspace</p>
                            </div>

                            <div className="rounded-[24px] bg-white border border-black/5 p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Tasks</span>
                                    <Sparkles className="h-[18px] w-[18px] text-slate-300" aria-hidden="true" />
                                </div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">{numberFormatter.format(totalTasks)}</div>
                                <p className="mt-1 text-[13px] text-slate-500">Tracked across all projects</p>
                            </div>

                            <div className="rounded-[24px] bg-white border border-black/5 p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Members</span>
                                    <Users className="h-[18px] w-[18px] text-slate-300" aria-hidden="true" />
                                </div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">
                                    {numberFormatter.format(team.members?.length || 0)}
                                </div>
                                <p className="mt-1 text-[13px] text-slate-500">Collaborators in {team.name}</p>
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-[32px] bg-slate-900 p-8 text-white shadow-xl flex flex-col justify-between">
                        <div>
                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Workspace Action</p>
                            <h2 className="mt-3 text-[22px] font-semibold text-white tracking-tight">Create a new project</h2>
                            <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
                                Start a fresh board for launches, internal ops, or the next experiment without leaving this workspace view.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold text-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 shadow-sm"
                        >
                            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                            New Project
                        </button>
                    </aside>
                </div>
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Project Index</p>
                        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-slate-900 text-balance">Browse Workspace Projects</h2>
                        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-500">
                            {canDeleteProject
                                ? "Search by name or key, open a board, or use owner actions from each project card when needed."
                                : "Search by name or key, then open the board you need."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 sm:w-80">
                            <label htmlFor="project-search" className="sr-only">Search projects</label>
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                id="project-search"
                                name="project_search"
                                type="search"
                                inputMode="search"
                                autoComplete="off"
                                spellCheck={false}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search projects…"
                                aria-label="Search projects"
                                className="w-full rounded-full border border-transparent bg-slate-50 py-3 pl-10 pr-5 text-[14px] text-slate-900 transition-[background-color,border-color,box-shadow] placeholder:text-slate-400 focus:bg-white focus:outline-none focus-visible:border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-200"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[14px] font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                        >
                            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                            New Project
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            teamSlug={team.slug}
                            canDelete={canDeleteProject}
                            onDelete={setProjectToDelete}
                        />
                    ))}

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-slate-50/50 p-6 text-center transition-[background-color,border-color,box-shadow,transform] hover:scale-[1.01] hover:border-slate-300 hover:bg-white hover:shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/5 bg-white text-slate-900 shadow-sm">
                            <Plus className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <p className="mt-5 text-[16px] font-semibold tracking-tight text-slate-900">Start a New Project</p>
                        <p className="mt-1.5 max-w-[18rem] text-[14px] text-slate-500">
                            Create a clean board for a launch, product stream, or internal workflow.
                        </p>
                    </button>
                </div>

                {filteredProjects.length === 0 && (
                    <EmptyState
                        className="mt-8"
                        title={searchQuery ? "No matching projects" : "No projects in this workspace yet"}
                        description={
                            searchQuery
                                ? `Nothing matched "${searchQuery}". Try a different keyword or create a new project.`
                                : `Create the first project and turn ${team.name} into an active delivery space.`
                        }
                    />
                )}
            </section>

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateProject}
                currentCount={usage?.projects_count ?? projects.length}
                maxCount={usage?.plan?.max_projects}
                teamSlug={team.slug}
            />

            {projectToDelete && (
                <DeleteProjectModal
                    isOpen={!!projectToDelete}
                    onClose={() => setProjectToDelete(null)}
                    onConfirm={handleDeleteProject}
                    project={projectToDelete}
                />
            )}
        </div>
    );
}
