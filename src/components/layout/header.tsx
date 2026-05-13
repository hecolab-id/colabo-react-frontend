"use client";

import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import Link from "@/components/app-link";
import { usePathname } from "@/lib/navigation";
import { TeamMembersModal } from "../team/team-members-modal";
import { FolderCog, Plus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCallback, useState } from "react";
import { UserMenu } from "./user-menu";

export function Header({
    onOpenCreateTask,
    projectTitle,
    onOpenProjectMembers,
    projectSettingsHref,
}: {
    onOpenCreateTask?: () => void;
    projectTitle?: string;
    onOpenProjectMembers?: () => void;
    projectSettingsHref?: string;
}) {
    const pathname = usePathname();
    const { currentTeam: team, user, loadTeams } = useStore();
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const pathSegments = pathname.split("/").filter(Boolean);
    const isMobileProjectRoute =
        pathSegments.length === 2 &&
        !["dashboard", "my-tasks"].includes(pathSegments[0]) &&
        !["members", "settings"].includes(pathSegments[1]);

    const mobileTitle = pathname === "/dashboard"
        ? "Dashboard"
        : pathname === "/my-tasks"
            ? "My Tasks"
            : pathname.startsWith("/dashboard")
                ? "Workspace"
                : team?.name || "Colabo";

    // Refresh team data when modal updates
    const handleTeamUpdate = useCallback(async () => {
        await loadTeams();
    }, [loadTeams]);

    return (
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-white/70 bg-white/76 px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-all md:h-[74px] md:min-h-0 md:px-6 md:py-0 md:pt-0">
            {isMobileProjectRoute ? (
                <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-slate-950">
                            {projectTitle || "Project"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            {team?.name || "Workspace"}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {projectSettingsHref ? (
                            <Link
                                href={projectSettingsHref}
                                className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-black/5 bg-white/78 text-slate-500 shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                aria-label="View project details"
                                title="View project"
                            >
                                <FolderCog className="h-[18px] w-[18px]" aria-hidden="true" />
                            </Link>
                        ) : null}
                        {onOpenProjectMembers ? (
                            <button
                                type="button"
                                onClick={onOpenProjectMembers}
                                className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-black/5 bg-white/78 text-slate-500 shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                aria-label="Show project members"
                                title="Members"
                            >
                                <Users className="h-[18px] w-[18px]" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 tracking-tight md:hidden">{mobileTitle}</p>
                    <p className="truncate text-xs text-slate-500 md:hidden">
                        {team?.name || "Your workspace"}
                    </p>
                </div>
            )}

            <div className="hidden min-w-0 md:block">
                {projectTitle ? (
                    <div className="flex min-w-0 items-center gap-3">
                        <h1 className="max-w-[34vw] truncate text-[17px] font-semibold tracking-tight text-slate-900">
                            {projectTitle}
                        </h1>
                        {projectSettingsHref ? (
                            <Link
                                href={projectSettingsHref}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100/70 hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            >
                                <FolderCog className="h-4 w-4" aria-hidden="true" />
                                View Project
                            </Link>
                        ) : null}
                        {onOpenProjectMembers ? (
                            <button
                                type="button"
                                onClick={onOpenProjectMembers}
                                className="inline-flex h-9 items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 text-[13px] font-semibold text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-950 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            >
                                <Users className="h-4 w-4" aria-hidden="true" />
                                Members
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className={`ml-auto items-center gap-1.5 md:flex md:gap-3 ${isMobileProjectRoute ? "hidden" : "flex"}`}>
                {team && onOpenCreateTask && (
                    <button
                        type="button"
                        onClick={onOpenCreateTask}
                        className="hidden items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground shadow-[0_14px_32px_rgba(109,93,252,0.20)] transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] hover:shadow-[0_18px_36px_rgba(109,93,252,0.24)] md:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Create Task
                    </button>
                )}
                
                {/* Visual Separator */}
                <div className="mx-1.5 hidden h-5 w-px bg-slate-200 md:block" />

                <button
                    onClick={() => setIsTeamModalOpen(true)}
                    className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent bg-white/60 text-slate-400 shadow-sm transition-all hover:border-white hover:bg-white hover:text-primary hover:scale-105 active:scale-95 md:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    title="Team Members"
                    aria-label="Open team members"
                >
                    <Users className="h-[20px] w-[20px]" aria-hidden="true" />
                </button>
                <NotificationsPopover />
                <UserMenu />
            </div>

            {isTeamModalOpen && team && user && (
                <TeamMembersModal
                    team={team}
                    currentUser={user}
                    onClose={() => setIsTeamModalOpen(false)}
                    onUpdate={handleTeamUpdate}
                />
            )}
        </header>
    );
}
