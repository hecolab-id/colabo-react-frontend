"use client";

import { useState } from "react";
import { ChevronDown, Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Team } from "@/lib/types";
import Link from "@/components/app-link";

interface TeamSwitcherProps {
    isCollapsed?: boolean;
}

export function TeamSwitcher({ isCollapsed = false }: TeamSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const teams = useStore((state) => state.teams);
    const currentTeam = useStore((state) => state.currentTeam);
    const setTeam = useStore((state) => state.setTeam);

    const handleSelect = (team: Team) => {
        setTeam(team);
        setIsOpen(false);
    };

    if (!currentTeam) return null;

    return (
        <div className="relative w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-[58px] w-full items-center gap-3 rounded-[1.15rem] border border-white/75 bg-white/72 px-3 py-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-white hover:bg-white hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                    isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? `Switch team: ${currentTeam.name}` : ""}
            >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-sm font-bold text-white shadow-sm">
                    {currentTeam.name.charAt(0)}
                </div>
                {!isCollapsed ? (
                    <>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{currentTeam.name}</div>
                            <div className="text-[11px] text-slate-500 capitalize truncate font-medium">{currentTeam.role?.toLowerCase() || "member"}</div>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </>
                ) : (
                    <ChevronsUpDown className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-slate-400 shadow-sm" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div
                        className={cn(
                            "absolute z-50 mt-2 w-64 overflow-hidden rounded-[20px] border border-white/80 bg-white/88 p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl",
                            isCollapsed ? "left-16 top-0" : "top-full left-0 right-0"
                        )}
                    >
                        <div className="space-y-0.5">
                            {teams.map((team) => (
                                <button
                                    key={team.id}
                                    onClick={() => handleSelect(team)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-[14px] text-left transition-colors hover:cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50",
                                        team.id === currentTeam.id ? "bg-slate-100/80" : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 rounded-[10px] flex items-center justify-center font-bold text-[11px] flex-shrink-0",
                                        team.id === currentTeam.id ? "bg-primary-dark text-white" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {team.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-semibold text-slate-900 truncate">{team.name}</div>
                                        <div className="text-[11px] text-slate-500 capitalize truncate font-medium">{team.role?.toLowerCase()}</div>
                                    </div>
                                    {team.id === currentTeam.id && <Check className="w-4 h-4 text-slate-900 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <div className="mt-1 pt-1 border-t border-black/5">
                            <Link
                                href="/dashboard/teams/create"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-[14px] text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-slate-50"
                            >
                                <div className="w-7 h-7 rounded-[10px] border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 bg-slate-50/50">
                                    <Plus className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-[13px] font-medium text-slate-600">Create new team</span>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
