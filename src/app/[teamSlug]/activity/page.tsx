"use client";

import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import { ChevronRight } from "lucide-react";
import { useParams } from "@/lib/navigation";
import { getTeamBySlug } from "@/lib/api";
import { Team } from "@/lib/types";
import { useStore } from "@/lib/store";
import { TeamActivityFeed } from "@/components/activity/team-activity-feed";
import { TeamActivityOverviewPanel } from "@/components/activity/team-activity-overview";

export default function TeamActivityPage() {
    const params = useParams<{ teamSlug: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const setCurrentTeam = useStore((state) => state.setTeam);

    useEffect(() => {
        async function loadTeam() {
            try {
                setIsLoading(true);
                const teamData = await getTeamBySlug(params.teamSlug);
                setTeam(teamData);
                setCurrentTeam(teamData);
            } catch (error) {
                console.error("Failed to load team activity page:", error);
                if ((error as { response?: { status?: number } })?.response?.status === 404) {
                    setTeam(null);
                }
            } finally {
                setIsLoading(false);
            }
        }

        loadTeam();
    }, [params.teamSlug, setCurrentTeam]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-muted-foreground">Loading workspace activity…</div>
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
                        <h1 className=" text-3xl font-semibold text-slate-900 tracking-tight text-balance">Team not found</h1>
                        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                            The team “{params.teamSlug}” does not exist, or this account does not have access to it.
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-primary-dark px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-primary-dark-hover hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-[13px] font-semibold text-slate-500 shadow-sm">
                <Link href="/dashboard" className="transition-colors hover:text-slate-900">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <Link href={`/${team.slug}`} className="transition-colors hover:text-slate-900 line-clamp-1 max-w-[120px]">
                    {team.name}
                </Link>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="text-slate-900">Activity</span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[32px]">
                        Activity
                    </h1>
                    <p className="mt-1 text-[14px] text-slate-500 md:text-[15px]">
                        Meaningful progress, early signals, and supportive context for {team.name}.
                    </p>
                </div>

                <Link
                    href={`/${team.slug}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-900 transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                >
                    Back to Projects
                </Link>
            </div>

            <TeamActivityOverviewPanel teamSlug={team.slug}>
                <TeamActivityFeed
                    teamSlug={team.slug}
                />
            </TeamActivityOverviewPanel>
        </div>
    );
}
