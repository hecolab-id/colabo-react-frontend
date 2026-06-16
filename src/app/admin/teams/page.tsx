"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminPlans, getAdminTeams, updateAdminTeamSubscription } from "@/lib/api";
import { AdminListResponse, AdminPlan, AdminTeamRow } from "@/lib/types";
import {
    EmptyState,
    PaginationControls,
    SearchField,
    SkeletonRows,
    StatusPill,
    formatCompactNumber,
    formatNumber,
} from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";
import { TeamEditDrawer } from "@/components/admin/team-edit-drawer";
import { toast } from "@/components/ui/toast";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

type SubscriptionTone = "calm" | "alert" | "revenue" | "slate" | "warning";

const SUBSCRIPTION_TONES: Record<string, SubscriptionTone> = {
    SUBSCRIPTION: "calm",
    PENDING: "warning",
    CANCELLED: "slate",
    EXPIRED: "alert",
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
    SUBSCRIPTION: "Active",
    PENDING: "Pending",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
};

export default function AdminTeamsPage() {
    const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [draft, setDraft] = useState<{ status: string; plan_id?: string }>({ status: "PENDING" });
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const teamsQ = useAdminQuery<AdminListResponse<AdminTeamRow>>(
        (signal) => getAdminTeams({ q: query, page, page_size: pageSize }, signal),
        [query, page],
        "Couldn't load teams. Retry?",
    );

    // Plans is a one-shot fetch on mount; useAdminQuery just gives us the
    // same loading/error contract for free. It doesn't refetch on filter
    // change because its dep list is empty.
    const plansQ = useAdminQuery<AdminListResponse<AdminPlan>>(
        (signal) => getAdminPlans({ page: 1, page_size: 100 }, signal),
        [],
        "Couldn't load plans. Retry?",
    );

    const teams = teamsQ.data?.items ?? [];
    const total = teamsQ.data?.meta.total ?? 0;
    const plans = plansQ.data?.items ?? [];

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const editingTeam = useMemo(
        () => teams.find((team) => team.id === editingTeamId) || null,
        [teams, editingTeamId],
    );

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const openEdit = (team: AdminTeamRow) => {
        setEditingTeamId(team.id);
        setDraft({
            status: team.subscription_status || "PENDING",
            plan_id: team.current_plan_id || plans[0]?.id,
        });
    };

    const closeEdit = () => {
        setEditingTeamId(null);
    };

    const handleDraftChange = (field: "status" | "plan_id", value: string) => {
        setDraft((current) => ({ ...current, [field]: value || undefined }));
    };

    const handleSave = async () => {
        if (!editingTeam) return;
        try {
            setSavingTeamId(editingTeam.id);
            await updateAdminTeamSubscription(editingTeam.id, {
                status: draft.status,
                plan_id: draft.plan_id,
            });
            teamsQ.reload();
            setEditingTeamId(null);
        } catch (error) {
            console.error("Failed to update team subscription:", error);
            toast.error("Couldn't save the subscription. Please try again.");
        } finally {
            setSavingTeamId(null);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <header className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Teams</p>
                    <h2 className=" text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        All teams
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Every tenant in one place. Search by name, owner, or status. Tap a row to update plan and subscription.
                    </p>
                </header>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <SearchField
                            value={query}
                            onChange={(value) => {
                                setQuery(value);
                                setPage(1);
                            }}
                            placeholder="Search team, owner, email, or status"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground sm:ml-auto sm:shrink-0">
                        {teamsQ.isInitialLoading
                            ? "Loading…"
                            : `${formatNumber(total)} ${total === 1 ? "team" : "teams"}`}
                    </p>
                </div>

                {teamsQ.isInitialLoading ? (
                    <SkeletonRows count={4} rowHeight={120} />
                ) : teamsQ.error ? (
                    <EmptyState message={teamsQ.error} />
                ) : teams.length === 0 ? (
                    <EmptyState message="No teams match this search yet. Teams appear here once users complete signup." />
                ) : (
                    <ul className={`space-y-2 ${teamsQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}`}>

                        {teams.map((team) => {
                            const subStatus = team.subscription_status || "PENDING";
                            const subscriptionTone = SUBSCRIPTION_TONES[subStatus] || "slate";
                            const subscriptionLabel = SUBSCRIPTION_LABELS[subStatus] || subStatus;
                            const planName = plans.find((plan) => plan.id === team.current_plan_id)?.name || "No plan";

                            return (
                                <li
                                    key={team.id}
                                    className="rounded-[16px] border border-black/5 bg-white p-4 transition hover:border-black/10 hover:shadow-float sm:p-5"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                                <h3 className="truncate text-base font-semibold text-foreground">{team.name}</h3>
                                                <span className="font-mono text-[12px] text-muted-foreground">{team.slug}</span>
                                            </div>
                                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                                {team.owner_name}
                                                <span className="mx-1.5 text-muted-foreground/60">·</span>
                                                <span className="font-mono text-[12px]">{team.owner_email}</span>
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                                                <span>
                                                    <strong className="font-semibold text-foreground">{formatNumber(team.total_members)}</strong>{" "}
                                                    {team.total_members === 1 ? "member" : "members"}
                                                </span>
                                                <span>
                                                    <strong className="font-semibold text-foreground">{formatNumber(team.project_count)}</strong>{" "}
                                                    {team.project_count === 1 ? "project" : "projects"}
                                                </span>
                                                <span>
                                                    <strong className="font-semibold text-foreground">
                                                        {formatCompactNumber(team.monthly_ai_tokens_used)}
                                                    </strong>{" "}
                                                    AI tokens
                                                </span>
                                                <span>
                                                    <strong className="font-semibold text-foreground">
                                                        {formatNumber(team.monthly_whatsapp_messages)}
                                                    </strong>{" "}
                                                    WA messages
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                                            <div className="flex flex-col items-start gap-1 sm:items-end">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                    {planName}
                                                </span>
                                                <StatusPill tone={subscriptionTone} label={subscriptionLabel} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openEdit(team)}
                                                className="h-11 rounded-full border border-black/5 bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted md:h-9"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {!teamsQ.isInitialLoading && teams.length > 0 ? (
                    <PaginationControls
                        page={page}
                        totalPages={totalPages}
                        totalItems={total}
                        label={total === 1 ? "team" : "teams"}
                        onChange={setPage}
                    />
                ) : null}
            </div>

            <TeamEditDrawer
                team={editingTeam}
                open={!!editingTeamId}
                onClose={closeEdit}
                plans={plans}
                draft={draft}
                onChange={handleDraftChange}
                onSave={handleSave}
                saving={savingTeamId === editingTeamId}
            />
        </>
    );
}
