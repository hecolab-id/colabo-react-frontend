"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/app-link";
import { usePathname, useRouter } from "@/lib/navigation";
import {
    Activity,
    Check,
    CheckCircle2,
    FolderKanban,
    LayoutDashboard,
    Menu,
    Plus,
    Settings,
    Users,
    X,
} from "lucide-react";
import { getProjects } from "@/lib/api";
import { isPaidSubscription } from "@/lib/billing";
import { useStore } from "@/lib/store";
import { Project, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SidebarUsageIndicator } from "./sidebar-usage";

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenProjectModal?: () => void;
}

interface MobileNavLinkItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-2 mb-2">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
                {children}
            </h3>
        </div>
    );
}

function TeamPicker({
    teams,
    currentTeam,
    onSelect,
}: {
    teams: Team[];
    currentTeam: Team | null;
    onSelect: (team: Team) => void;
}) {
    if (!currentTeam) return null;

    return (
        <div className="rounded-[28px] border border-black/5 bg-slate-50 p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">Workspace</p>
                    <h2 className="mt-1 text-[17px] font-semibold text-slate-900 tracking-tight">Active Context</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-900 text-[15px] font-semibold text-white shadow-sm">
                    {currentTeam.name.charAt(0)}
                </div>
            </div>

            <div className="space-y-1.5">
                {teams.map((team) => (
                    <button
                        key={team.id}
                        type="button"
                        onClick={() => onSelect(team)}
                        className={cn(
                            "flex w-full touch-manipulation items-center gap-3.5 rounded-[20px] px-4 py-3.5 text-left transition-all active:scale-[0.98] outline-none",
                            currentTeam.id === team.id
                                ? "bg-white text-slate-900 shadow-sm border border-black/5 font-semibold"
                                : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                        )}
                    >
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-[14px] text-[13px] font-bold shadow-sm", currentTeam.id === team.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600")}>
                            {team.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px]">{team.name}</div>
                            {currentTeam.id === team.id && (
                                <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500 capitalize">
                                    {team.role?.toLowerCase() || "member"}
                                </div>
                            )}
                        </div>
                        {currentTeam.id === team.id && <Check className="h-[18px] w-[18px] text-slate-900" aria-hidden="true" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

function MobileSheetNavLink({
    item,
    isActive,
    onNavigate,
}: {
    item: MobileNavLinkItem;
    isActive: boolean;
    onNavigate: () => void;
}) {
    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
                "flex touch-manipulation items-center gap-3.5 rounded-[20px] px-4 py-3.5 text-[15px] transition-all active:scale-[0.98] outline-none",
                isActive
                    ? "bg-slate-900 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]"
                    : "bg-transparent text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            <item.icon className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
            <span className="truncate">{item.name}</span>
        </Link>
    );
}

export function MobileBottomNav({
    isOpen,
    onOpen,
    onClose,
}: {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}) {
    const pathname = usePathname();
    const currentTeam = useStore((state) => state.currentTeam);

    const items = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: pathname === "/dashboard" },
        { name: "My Tasks", href: "/my-tasks", icon: CheckCircle2, active: pathname === "/my-tasks" },
        {
            name: "Projects",
            href: currentTeam ? `/${currentTeam.slug}` : "",
            icon: FolderKanban,
            active: currentTeam ? pathname === `/${currentTeam.slug}` || pathname.startsWith(`/${currentTeam.slug}/`) : false,
            disabled: !currentTeam,
        },
    ];

    return (
        <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 backdrop-blur-xl md:hidden"
        >
            <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
                {items.map((item) =>
                    item.disabled ? (
                        <div
                            key={item.name}
                            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-medium text-slate-300 pointer-events-none"
                        >
                            <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                            <span>{item.name}</span>
                        </div>
                    ) : (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex min-h-[48px] touch-manipulation flex-col items-center justify-center gap-1 px-2 text-[10px] transition-all active:scale-95 outline-none",
                                item.active
                                    ? "text-slate-900 font-semibold"
                                    : "text-slate-400 font-medium hover:text-slate-600"
                            )}
                        >
                            <item.icon className={cn("h-[22px] w-[22px]", item.active && "drop-shadow-sm")} aria-hidden="true" />
                            <span>{item.name}</span>
                        </Link>
                    )
                )}

                <button
                    type="button"
                    onClick={isOpen ? onClose : onOpen}
                    aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                    className={cn(
                        "flex min-h-[48px] touch-manipulation flex-col items-center justify-center gap-1 px-2 text-[10px] transition-all active:scale-95 outline-none",
                        isOpen
                            ? "text-slate-900 font-semibold"
                            : "text-slate-400 font-medium hover:text-slate-600"
                    )}
                >
                    <Menu className={cn("h-[22px] w-[22px]", isOpen && "drop-shadow-sm")} aria-hidden="true" />
                    <span>More</span>
                </button>
            </div>
        </nav>
    );
}

export function MobileNavSheet({
    isOpen,
    onClose,
    onOpenProjectModal,
}: MobileNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const teams = useStore((state) => state.teams);
    const currentTeam = useStore((state) => state.currentTeam);
    const currentUser = useStore((state) => state.user);
    const setTeam = useStore((state) => state.setTeam);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (!isOpen || !currentTeam) {
            if (!currentTeam) {
                setProjects([]);
            }
            return;
        }

        getProjects(currentTeam.slug)
            .then((fetchedProjects) => {
                setProjects(fetchedProjects || []);
            })
            .catch(console.error);
    }, [currentTeam, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
        // We only want route changes to dismiss the sheet.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const personalNav: MobileNavLinkItem[] = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Tasks", href: "/my-tasks", icon: CheckCircle2 },
    ];

    const isOwner = !!currentTeam && !!currentUser && currentTeam.owner_id === currentUser.id;

    const teamNav: MobileNavLinkItem[] = currentTeam
        ? [
            { name: "Projects", href: `/${currentTeam.slug}`, icon: FolderKanban },
            { name: "Activity", href: `/${currentTeam.slug}/activity`, icon: Activity },
            { name: "Members", href: `/${currentTeam.slug}/members`, icon: Users },
            ...(isOwner ? [{ name: "Team Settings", href: `/${currentTeam.slug}/settings`, icon: Settings }] : []),
        ]
        : [];

    const recentProjects = useMemo(() => projects.slice(0, 5), [projects]);

    const handleNavigate = () => {
        onClose();
    };

    const handleSelectTeam = (team: Team) => {
        setTeam(team);
        onClose();
        router.push(`/${team.slug}`);
    };

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    aria-label="Close navigation overlay"
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
                />
            )}

            <section
                aria-hidden={!isOpen}
                className={cn(
                    "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-[32px] bg-white shadow-[0_-22px_60px_rgba(0,0,0,0.15)] transition-transform duration-300 md:hidden",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
                    <div>
                        <h2 className="text-[19px] font-semibold text-slate-900 tracking-tight">Navigation</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation menu"
                        className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-90 outline-none"
                    >
                        <X className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                </div>

                <div className="max-h-[calc(88dvh-80px)] overflow-y-auto overflow-x-hidden px-4 py-5 [overscroll-behavior:contain]">
                    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                        <TeamPicker teams={teams} currentTeam={currentTeam} onSelect={handleSelectTeam} />

                        <div className="space-y-3">
                            <MobileSectionLabel>Personal</MobileSectionLabel>
                            <div className="space-y-2">
                                {personalNav.map((item) => (
                                    <MobileSheetNavLink
                                        key={item.name}
                                        item={item}
                                        isActive={pathname === item.href}
                                        onNavigate={handleNavigate}
                                    />
                                ))}
                            </div>
                        </div>

                        {currentTeam && (
                            <div className="space-y-3">
                                <MobileSectionLabel>Current Team</MobileSectionLabel>
                                <div className="space-y-2">
                                    {teamNav.map((item) => {
                                        const isActive =
                                            item.name === "Projects"
                                                ? pathname === `/${currentTeam.slug}` || pathname.startsWith(`/${currentTeam.slug}/`)
                                                : pathname === item.href || pathname.startsWith(`${item.href}/`);

                                        return (
                                            <MobileSheetNavLink
                                                key={item.name}
                                                item={item}
                                                isActive={isActive}
                                                onNavigate={handleNavigate}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="rounded-[28px] border border-black/5 bg-slate-50 p-5 mt-2">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">Recent Projects</p>
                                        </div>

                                        {onOpenProjectModal && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onOpenProjectModal();
                                                }}
                                                aria-label="Create a new project"
                                                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-[14px] bg-white text-slate-900 shadow-sm border border-black/5 transition-all active:scale-95 outline-none"
                                            >
                                                <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        {recentProjects.map((project) => {
                                            const href = `/${currentTeam.slug}/${project.slug}`;
                                            const isActive = pathname.startsWith(href);

                                            return (
                                                <Link
                                                    key={project.id}
                                                    href={href}
                                                    onClick={handleNavigate}
                                                    className={cn(
                                                        "flex touch-manipulation items-center gap-3.5 rounded-[20px] px-4 py-3 text-[15px] transition-all active:scale-[0.98] outline-none",
                                                        isActive
                                                            ? "bg-white text-slate-900 font-semibold border border-black/5 shadow-sm"
                                                            : "bg-transparent text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900"
                                                    )}
                                                >
                                                    <FolderKanban className="h-[18px] w-[18px] shrink-0 opacity-70" aria-hidden="true" />
                                                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                                                </Link>
                                            );
                                        })}

                                        {recentProjects.length === 0 && (
                                            <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/50 px-4 py-5 text-[14px] font-medium text-slate-500 text-center">
                                                No active projects yet.
                                            </div>
                                        )}

                                        {projects.length > 5 && (
                                            <div className="pt-2">
                                                <Link
                                                    href={`/${currentTeam.slug}`}
                                                    onClick={handleNavigate}
                                                    className="flex w-full min-h-[44px] items-center justify-center rounded-[20px] text-[13px] font-semibold text-slate-500 bg-white border border-black/5 shadow-sm transition hover:text-slate-900 active:scale-95"
                                                >
                                                    Reveal all folders
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-black/5 bg-slate-50 p-5 mt-2">
                                    <MobileSectionLabel>Utility</MobileSectionLabel>
                                    <div className="mt-3">
                                        {isOwner && !isPaidSubscription(currentTeam.subscription?.status) ? (
                                            <SidebarUsageIndicator teamId={currentTeam.id} />
                                        ) : isOwner ? (
                                            <Link
                                                href={`/${currentTeam.slug}/settings`}
                                                onClick={handleNavigate}
                                                className="flex touch-manipulation items-center justify-between rounded-[20px] bg-white border border-black/5 shadow-sm px-4 py-4 text-[14px] font-semibold text-slate-900 transition-all hover:border-slate-300 active:scale-[0.98] outline-none"
                                            >
                                                <span>Manage workspace plan</span>
                                                <Settings className="h-4 w-4 opacity-50" aria-hidden="true" />
                                            </Link>
                                        ) : (
                                            <div className="rounded-[20px] bg-white/80 px-4 py-4 text-[13px] font-medium text-slate-500 text-balance border border-black/5">
                                                Billing controls are restricted to the primary workspace owner.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!currentTeam && (
                            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-[14px] font-medium text-slate-500 text-center">
                                Connect to a workspace to reveal assignments and project routing.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
