"use client";

import Link from "@/components/app-link";
import { usePathname } from "@/lib/navigation";
import {
    Activity,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    LayoutDashboard,
    Plus,
    Settings,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { TeamSwitcher } from "./team-switcher";
import { SidebarUsageIndicator } from "./sidebar-usage";
import { useProjects } from "@/lib/hooks/use-project";

interface SidebarProps {
    isCollapsed?: boolean;
    toggleSidebar?: () => void;
    onOpenProjectModal?: () => void;
}

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    badge?: string;
}

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
    if (isCollapsed) return null;

    return (
        <div className="px-4 pb-1.5 pt-5 first:pt-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
            </h3>
        </div>
    );
}

function SidebarNavLink({
    item,
    isActive,
    isCollapsed,
}: {
    item: NavItem;
    isActive: boolean;
    isCollapsed: boolean;
}) {
    const baseClasses = cn(
        "flex h-[44px] items-center gap-3 rounded-[1rem] px-3.5 text-[14px] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        isCollapsed && "justify-center px-0 h-10 rounded-[12px] w-10 mx-auto",
        item.disabled
            ? "cursor-default text-slate-400/50 hover:bg-transparent"
            : isActive
                ? "border border-white bg-white text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.08)] font-semibold"
                : "text-slate-500 hover:bg-white/80 hover:text-slate-900 font-medium"
    );

    const content = (
        <>
            <item.icon className={cn("flex-shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
            {!isCollapsed && (
                <>
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {item.badge}
                        </span>
                    )}
                </>
            )}
        </>
    );

    if (item.disabled) {
        return (
            <div className={baseClasses} title={isCollapsed ? `${item.name}${item.badge ? ` (${item.badge})` : ""}` : undefined}>
                {content}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            className={baseClasses}
            title={isCollapsed ? item.name : undefined}
        >
            {content}
        </Link>
    );
}

export function Sidebar({ isCollapsed = false, toggleSidebar, onOpenProjectModal }: SidebarProps) {
    const pathname = usePathname();
    const currentTeam = useStore((state) => state.currentTeam);
    const currentUser = useStore((state) => state.user);
    const { data: projects = [] } = useProjects(currentTeam?.slug || "");

    const personalNav: NavItem[] = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Tasks", href: "/my-tasks", icon: CheckCircle2 },
    ];

    const isOwner = !!currentTeam && !!currentUser && currentTeam.owner_id === currentUser.id;

    const teamNav: NavItem[] = currentTeam
        ? [
            { name: "Projects", href: `/${currentTeam.slug}`, icon: FolderKanban },
            { name: "Activity", href: `/${currentTeam.slug}/activity`, icon: Activity },
            { name: "Members", href: `/${currentTeam.slug}/members`, icon: Users },
            ...(isOwner ? [{ name: "Team Settings", href: `/${currentTeam.slug}/settings`, icon: Settings }] : []),
        ]
        : [];

    const recentProjects = (currentTeam ? projects : []).slice(0, 5);

    const isPersonalActive = (href: string) => pathname === href;
    const isTeamActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const isProjectsHubActive = currentTeam ? pathname === `/${currentTeam.slug}` || pathname.startsWith(`/${currentTeam.slug}/`) : false;

    return (
        <div
            className={cn(
                "relative z-40 flex h-screen overflow-visible flex-col border-r border-white/70 bg-[linear-gradient(180deg,rgba(252,253,255,0.94),rgba(245,248,252,0.96))] shadow-[20px_0_60px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 ease-in-out font-sans",
                isCollapsed ? "w-[76px]" : "w-72"
            )}
        >
            <div className="flex h-[78px] items-center justify-center border-b border-white/70 px-4 pt-1">
                <TeamSwitcher isCollapsed={isCollapsed} />
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4">
                <nav className="space-y-6">
                    <div className="space-y-1">
                        <SectionLabel label="Personal" isCollapsed={isCollapsed} />
                        {personalNav.map((item) => (
                            <SidebarNavLink
                                key={item.name}
                                item={item}
                                isActive={!item.disabled && isPersonalActive(item.href)}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </div>

                    {currentTeam && !isCollapsed && (
                        <div className="space-y-1">
                            <div className="mb-2.5 flex items-center justify-between px-4">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                    Recent Projects
                                </span>
                                {onOpenProjectModal && (
                                    <button
                                        onClick={onOpenProjectModal}
                                        className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-900 hover:cursor-pointer"
                                        title="New Project"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-0.5">
                                {recentProjects.map((project) => {
                                    const projectHref = `/${currentTeam.slug}/${project.slug}`;
                                    const isActive = pathname.startsWith(projectHref);

                                    return (
                                        <Link
                                            key={project.id}
                                            href={projectHref}
                                            className={cn(
                                                "flex h-9 items-center gap-3 rounded-[12px] px-4 text-[13px] transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                                isActive
                                                    ? "border border-white bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)] font-semibold"
                                                    : "text-slate-500 hover:bg-white/80 hover:text-slate-900 font-medium"
                                            )}
                                        >
                                            <FolderKanban className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-slate-900" : "text-slate-400")} />
                                            <span className="truncate">{project.name}</span>
                                        </Link>
                                    );
                                })}

                                {recentProjects.length === 0 && (
                                    <div className="px-4 py-2 text-xs italic text-slate-500">
                                        No projects yet
                                    </div>
                                )}

                                {projects.length > 5 && (
                                    <Link
                                        href={`/${currentTeam.slug}`}
                                        className="flex items-center px-4 py-3 text-[13px] font-semibold text-slate-900 transition hover:opacity-80"
                                    >
                                        View all projects
                                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {currentTeam && (
                        <div className="space-y-1">
                            <SectionLabel label="Current Team" isCollapsed={isCollapsed} />

                            {teamNav.map((item) => {
                                const isActive = item.name === "Projects"
                                    ? isProjectsHubActive
                                    : isTeamActive(item.href);

                                return (
                                    <SidebarNavLink
                                        key={item.name}
                                        item={item}
                                        isActive={isActive}
                                        isCollapsed={isCollapsed}
                                    />
                                );
                            })}
                        </div>
                    )}
                </nav>
            </div>

            <button
                onClick={toggleSidebar}
                className="absolute right-0 top-8 z-[70] grid h-8 w-8 translate-x-1/2 place-items-center rounded-full border border-white/80 bg-white text-slate-400 shadow-[0_12px_30px_rgba(15,23,42,0.14)] outline-none transition-all hover:scale-110 hover:bg-slate-50 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <div className="mt-auto border-t border-white/70 p-4">
                {!isCollapsed && currentTeam && (
                    <div className="space-y-2">
                        <SectionLabel label="Utility" isCollapsed={false} />
                        <SidebarUsageIndicator teamId={currentTeam.id} />
                    </div>
                )}
            </div>
        </div>
    );
}
