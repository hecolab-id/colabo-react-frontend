"use client";

import { useEffect, useState } from "react";
import Link from "@/components/app-link";
import { toast } from "@/components/ui/toast";
import { getTeamActivities } from "@/lib/api";
import { TeamActivityItem } from "@/lib/types";

interface TeamActivityFeedProps {
    teamSlug: string;
    initialPageSize?: number;
    cardClassName?: string;
    title?: string;
    subtitle?: string;
}

export function TeamActivityFeed({
    teamSlug,
    initialPageSize = 5,
    cardClassName = "rounded-[32px] border border-black/5 bg-white p-6 shadow-sm md:p-8",
    title,
    subtitle,
}: TeamActivityFeedProps) {
    const [activities, setActivities] = useState<TeamActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        async function loadActivities() {
            try {
                setIsLoading(true);
                const response = await getTeamActivities(teamSlug, 1, initialPageSize);
                setActivities(response.data || []);
                setPage(response.page || 1);
                setTotalPages(response.total_pages || 0);
            } catch (error) {
                console.error("Failed to load team activities:", error);
                setActivities([]);
                setPage(1);
                setTotalPages(0);
            } finally {
                setIsLoading(false);
            }
        }

        loadActivities();
    }, [initialPageSize, teamSlug]);

    const hasMore = page < totalPages;

    const handleLoadMore = async () => {
        if (!hasMore || isLoadingMore) return;

        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const response = await getTeamActivities(teamSlug, nextPage, initialPageSize);
            setActivities((current) => [...current, ...(response.data || [])]);
            setPage(response.page || nextPage);
            setTotalPages(response.total_pages || totalPages);
        } catch (error) {
            console.error("Failed to load more team activities:", error);
            toast.error("Couldn't load more activity. Please try again.");
        } finally {
            setIsLoadingMore(false);
        }
    };

    return (
        <section className={cardClassName}>
            {title ? (
                <div className="mb-5">
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">{title}</h2>
                    {subtitle ? (
                        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{subtitle}</p>
                    ) : null}
                </div>
            ) : null}
            {isLoading ? (
                <div className="grid gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                            <div className="h-4 w-2/3 rounded-full bg-slate-200" />
                            <div className="mt-3 h-3 w-1/3 rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>
            ) : activities.length > 0 ? (
                <>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2 pb-2">
                        {activities.map((activity) => (
                            <article key={activity.id} className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[16px] font-medium leading-relaxed text-slate-900">
                                            {activity.message}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-slate-500">
                                            <span className="font-semibold text-slate-700">{activity.actor.name}</span>
                                            <span className="text-slate-400">•</span>
                                            <span>{formatActivityTimestamp(activity.created_at)}</span>
                                            <Link
                                                href={`/${teamSlug}/${activity.project_slug}`}
                                                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:text-slate-900 hover:bg-slate-200"
                                            >
                                                {activity.project_name}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="shrink-0 mt-2 md:mt-0">
                                        <div className="inline-flex rounded-full border border-black/5 bg-white px-3 py-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase shadow-sm">
                                            {activity.task_title || "Task update"}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {hasMore ? (
                        <div className="mt-8 flex justify-center">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="inline-flex items-center justify-center rounded-full border border-black/5 bg-white px-6 py-3 text-[14px] font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLoadingMore ? "Loading more..." : "Load more activity"}
                            </button>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="rounded-[32px] border border-black/5 bg-slate-50 px-6 py-16 text-center shadow-sm">
                    <p className="text-[18px] font-semibold tracking-tight text-slate-900">No activity yet</p>
                    <p className="mt-2 text-[15px] text-slate-500 max-w-md mx-auto leading-relaxed">
                        Task moves, updates, and comments from team members will show up here once work starts moving.
                    </p>
                </div>
            )}
        </section>
    );
}

function formatActivityTimestamp(value: string) {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}
