"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminProjects, getAdminTeams, getAdminPlans, updateAdminTeamSubscription, getAdminDashboard } from "@/lib/api";
import { AdminOverview, AdminPlan, AdminProjectRow, AdminTeamRow } from "@/lib/types";
import {
    BarList,
    EmptyState,
    Metric,
    PaginationControls,
    Panel,
    SearchField,
    StatusPill,
    formatCompactNumber,
    formatNumber,
} from "@/components/admin/admin-ui";

export default function AdminTeamsPage() {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState<AdminTeamRow[]>([]);
    const [projects, setProjects] = useState<AdminProjectRow[]>([]);
    const [plans, setPlans] = useState<AdminPlan[]>([]);
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
    const [teamDrafts, setTeamDrafts] = useState<Record<string, { status: string; plan_id?: string }>>({});
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 12;
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [teamRows, projectRows, planRows, overviewData] = await Promise.all([
                    getAdminTeams({ q: query, page, page_size: pageSize }),
                    getAdminProjects(),
                    getAdminPlans({ page: 1, page_size: 100 }),
                    getAdminDashboard(),
                ]);
                setTeams(teamRows?.items || []);
                setTotal(teamRows?.meta?.total || 0);
                setProjects(projectRows || []);
                setPlans(planRows?.items || []);
                setOverview(overviewData);
                setTeamDrafts(
                    Object.fromEntries(
                        (teamRows?.items || []).map((team) => [
                            team.id,
                            {
                                status: team.subscription_status || "PENDING",
                                plan_id: team.current_plan_id || planRows?.items?.[0]?.id,
                            },
                        ]),
                    ),
                );
            } catch (error) {
                console.error("Failed to load admin teams:", error);
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [page, query]);

    const highUsageTeams = useMemo(() => {
        return [...teams].sort((left, right) => right.monthly_ai_tokens_used - left.monthly_ai_tokens_used).slice(0, 5);
    }, [teams]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const handleTeamDraftChange = (teamId: string, field: "status" | "plan_id", value: string) => {
        setTeamDrafts((current) => ({
            ...current,
            [teamId]: {
                ...current[teamId],
                [field]: value || undefined,
            },
        }));
    };

    const handleTeamSubscriptionSave = async (teamId: string) => {
        const draft = teamDrafts[teamId];
        if (!draft) return;

        try {
            setSavingTeamId(teamId);
            await updateAdminTeamSubscription(teamId, {
                status: draft.status,
                plan_id: draft.plan_id,
            });
            const teamRows = await getAdminTeams({ q: query, page, page_size: pageSize });
            setTeams(teamRows?.items || []);
            setTotal(teamRows?.meta?.total || 0);
        } catch (error) {
            console.error("Failed to update team subscription:", error);
        } finally {
            setSavingTeamId(null);
        }
    };

    if (loading) {
        return <div className="rounded-[28px] border border-white/10 bg-[#111827]/60 p-8 text-sm text-slate-300">Loading team health.</div>;
    }

    return (
        <div className="space-y-4">
            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Panel
                    eyebrow="Teams"
                    title="Tenant health and resource monitoring"
                    subtitle="Operational teams live here so owners can review health and update subscriptions without scanning billing or user tables."
                >
                    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                        <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search team, owner, email, plan, or status" />
                        <Metric label="Matching teams" value={formatNumber(total)} />
                    </div>

                    <div className="hidden xl:block">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1120px] text-sm">
                                <thead className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                                    <tr>
                                        <th className="pb-3">Team</th>
                                        <th className="pb-3">Owner</th>
                                        <th className="pb-3">Members</th>
                                        <th className="pb-3">Projects</th>
                                        <th className="pb-3">WhatsApp</th>
                                        <th className="pb-3">AI Usage</th>
                                        <th className="pb-3">Plan</th>
                                        <th className="pb-3">Subscription</th>
                                        <th className="pb-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/6">
                                    {teams.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                                                No teams match this search yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        teams.map((team) => {
                                            const draft = teamDrafts[team.id];
                                            return (
                                                <tr key={team.id} className="align-top text-slate-200">
                                                    <td className="py-4">
                                                        <div className="font-medium text-white">{team.name}</div>
                                                        <div className="mt-1 text-xs text-slate-500">{team.slug}</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <div>{team.owner_name}</div>
                                                        <div className="mt-1 text-xs text-slate-500">{team.owner_email}</div>
                                                    </td>
                                                    <td className="py-4 [font-variant-numeric:tabular-nums]">{team.total_members}</td>
                                                    <td className="py-4 [font-variant-numeric:tabular-nums]">{team.project_count}</td>
                                                    <td className="py-4">
                                                        <StatusPill tone={team.whatsapp_status === "CONNECTED" ? "calm" : "slate"} label={team.whatsapp_status} />
                                                    </td>
                                                    <td className="py-4">
                                                        <div>{formatCompactNumber(team.monthly_ai_tokens_used)} tokens</div>
                                                        <div className="mt-1 text-xs text-slate-500">{formatNumber(team.monthly_whatsapp_messages)} WA messages</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <select
                                                            aria-label={`Plan for ${team.name}`}
                                                            value={draft?.plan_id || plans[0]?.id || ""}
                                                            onChange={(event) => handleTeamDraftChange(team.id, "plan_id", event.target.value)}
                                                            className="w-full rounded-2xl border border-white/10 bg-[#0a1120] px-3 py-2 text-sm text-white"
                                                        >
                                                            {plans.map((plan) => (
                                                                <option key={plan.id} value={plan.id}>
                                                                    {plan.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-4">
                                                        <select
                                                            aria-label={`Subscription status for ${team.name}`}
                                                            value={draft?.status || "PENDING"}
                                                            onChange={(event) => handleTeamDraftChange(team.id, "status", event.target.value)}
                                                            className="w-full rounded-2xl border border-white/10 bg-[#0a1120] px-3 py-2 text-sm text-white"
                                                        >
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                            <option value="EXPIRED">EXPIRED</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleTeamSubscriptionSave(team.id)}
                                                            aria-label={`Apply subscription changes for ${team.name}`}
                                                            className="rounded-full border border-[#6eb6c7]/20 bg-[#6eb6c7]/12 px-4 py-2 text-xs font-semibold text-[#d3f2f6] transition hover:bg-[#6eb6c7]/20"
                                                        >
                                                            {savingTeamId === team.id ? "Saving..." : "Apply"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-3 xl:hidden">
                        {teams.length === 0 ? (
                            <EmptyState message="No teams match this search yet." />
                        ) : (
                            teams.map((team) => {
                                const draft = teamDrafts[team.id];
                                return (
                                    <div key={team.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-white">{team.name}</p>
                                                <p className="mt-1 truncate text-sm text-slate-400">{team.owner_name}</p>
                                            </div>
                                            <StatusPill tone={team.whatsapp_status === "CONNECTED" ? "calm" : "slate"} label={team.whatsapp_status} />
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <Metric label="Members" value={formatNumber(team.total_members)} />
                                            <Metric label="Projects" value={formatNumber(team.project_count)} />
                                            <Metric label="AI Tokens" value={formatCompactNumber(team.monthly_ai_tokens_used)} />
                                            <Metric label="WA Messages" value={formatNumber(team.monthly_whatsapp_messages)} />
                                        </div>
                                        <div className="mt-4 grid gap-3">
                                            <select
                                                aria-label={`Plan for ${team.name}`}
                                                value={draft?.plan_id || plans[0]?.id || ""}
                                                onChange={(event) => handleTeamDraftChange(team.id, "plan_id", event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white"
                                            >
                                                {plans.map((plan) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                aria-label={`Subscription status for ${team.name}`}
                                                value={draft?.status || "PENDING"}
                                                onChange={(event) => handleTeamDraftChange(team.id, "status", event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white"
                                            >
                                                <option value="PENDING">PENDING</option>
                                                <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                                                <option value="CANCELLED">CANCELLED</option>
                                                <option value="EXPIRED">EXPIRED</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => void handleTeamSubscriptionSave(team.id)}
                                                aria-label={`Apply subscription changes for ${team.name}`}
                                                className="rounded-full bg-[#6eb6c7] px-5 py-3 text-sm font-semibold text-[#0d1829]"
                                            >
                                                {savingTeamId === team.id ? "Saving..." : "Apply changes"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-4">
                        <PaginationControls page={page} totalPages={totalPages} totalItems={total} label="teams" onChange={setPage} />
                    </div>
                </Panel>

                <div className="space-y-4">
                    <Panel
                        eyebrow="Projects"
                        title="Project ownership breakdown"
                        subtitle="A quick read on which teams carry the most active project load."
                    >
                        <BarList
                            items={overview?.projects_by_team.map((item) => ({
                                label: item.team_name,
                                value: item.project_count,
                            })) || []}
                        />
                    </Panel>

                    <Panel
                        eyebrow="Usage"
                        title="Highest token usage teams"
                        subtitle="A small watchlist for resource pressure and unusually active tenants."
                    >
                        <div className="space-y-3">
                            {highUsageTeams.length === 0 ? (
                                <EmptyState message="Usage data will appear here once teams begin consuming AI tokens." compact />
                            ) : (
                                highUsageTeams.map((team) => (
                                    <div key={team.id} className="rounded-[22px] border border-white/8 bg-[#0d1423] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-white">{team.name}</p>
                                                <p className="mt-1 text-sm text-slate-500">{team.owner_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">{formatCompactNumber(team.monthly_ai_tokens_used)}</p>
                                                <p className="text-xs text-slate-500">tokens / month</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>
                </div>
            </section>

            <section>
                <Panel
                    eyebrow="Recent Projects"
                    title="Latest project activity"
                    subtitle="A condensed project list for fast operational context without crowding the main team table."
                >
                    <div className="grid gap-3 lg:grid-cols-2">
                        {projects.length === 0 ? (
                            <EmptyState message="Projects will appear here once teams start building workspaces." />
                        ) : (
                            projects.slice(0, 6).map((project) => (
                                <div key={project.id} className="rounded-2xl border border-white/8 bg-[#0d1423] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-white">{project.name}</p>
                                            <p className="mt-1 truncate text-sm text-slate-400">{project.team_name}</p>
                                        </div>
                                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{project.key}</span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <Metric label="Tasks" value={formatNumber(project.task_count)} />
                                        <Metric label="Completed" value={formatNumber(project.completed_count)} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Panel>
            </section>
        </div>
    );
}
