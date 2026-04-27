import { Project } from "@/lib/types";
import { FolderKanban, Trash2 } from "lucide-react";
import Link from "@/components/app-link";

interface ProjectCardProps {
    project: Project;
    teamSlug: string;
    canDelete?: boolean;
    onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, teamSlug, canDelete = false, onDelete }: ProjectCardProps) {
    const completionRate = project.task_count > 0
        ? Math.min(100, Math.round((project.completed_count / project.task_count) * 100))
        : 0;
    const openTaskCount = Math.max(0, project.task_count - project.completed_count);

    return (
        <article className="group relative min-h-[220px] overflow-hidden rounded-[24px] border border-black/5 bg-slate-50/50 p-5 shadow-sm transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-1 hover:border-black/5 hover:bg-white hover:shadow-md md:p-6">
            <Link
                href={`/${teamSlug}/${project.slug}`}
                className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                aria-label={`Open ${project.name}`}
            />

            <div className="relative mb-5 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white text-sm font-semibold text-slate-900 shadow-sm transition-colors group-hover:bg-slate-900 group-hover:text-white">
                    {project.key.charAt(0)}
                </div>
                <div className="relative z-20 flex items-center gap-2">
                    <span className="rounded-lg border border-black/5 bg-white px-2.5 py-1 font-mono text-xs text-slate-500 shadow-sm">
                        {project.key}
                    </span>
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(project)}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-600 shadow-sm transition-[background-color,border-color,color,transform] hover:scale-105 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                            aria-label={`Delete ${project.name}`}
                            title="Delete project"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Delete
                        </button>
                    )}
                </div>
            </div>

            <h3 className="mb-1 min-w-0 truncate text-base font-medium text-slate-900">
                {project.name}
            </h3>
            <p className="mb-6 min-h-[40px] line-clamp-2 text-sm leading-5 text-slate-500">
                {project.description || "No description yet. Open the project to start shaping the work."}
            </p>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200/80" aria-hidden="true">
                <div
                    className="h-full rounded-full bg-slate-900 transition-[width]"
                    style={{ width: `${completionRate}%` }}
                />
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-black/5 pt-4">
                <div>
                    <p className="text-[11px] font-medium text-slate-400">Open</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">{openTaskCount}</p>
                </div>
                <div>
                    <p className="text-[11px] font-medium text-slate-400">Done</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">{project.completed_count}</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-medium text-slate-400">Progress</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">{completionRate}%</p>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                {project.task_count} tasks tracked
            </div>
        </article>
    );
}
