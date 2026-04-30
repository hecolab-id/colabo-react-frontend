"use client";

import { FormEvent, useEffect, useState } from "react";
import { createAdminPlan, deleteAdminPlan, getAdminPlans, updateAdminPlan } from "@/lib/api";
import { AdminPlan } from "@/lib/types";
import {
    EmptyState,
    Metric,
    NumberField,
    PaginationControls,
    Panel,
    SearchField,
    TextField,
    formatCompactNumber,
    formatCurrencyIdr,
    formatNumber,
} from "@/components/admin/admin-ui";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type PlanDraft = Omit<AdminPlan, "id" | "created_at">;

const emptyPlanDraft: PlanDraft = {
    name: "",
    max_projects: 3,
    max_members: 5,
    max_storage_mb: 1024,
    max_file_size_mb: 25,
    max_tasks_per_project: 500,
    ai_generations_per_month: 100,
    ai_tokens_per_month: 50000,
    price_per_user: 0,
    is_per_seat: true,
};

export default function AdminPlansPage() {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<AdminPlan[]>([]);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlanDraft);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 8;
    const [total, setTotal] = useState(0);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const response = await getAdminPlans({ q: query, page, page_size: pageSize });
            setPlans(response?.items || []);
            setTotal(response?.meta?.total || 0);
        } catch (error) {
            console.error("Failed to load admin plans:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPlans();
    }, [page, query]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const handlePlanSubmit = async (event: FormEvent) => {
        event.preventDefault();

        try {
            if (editingPlanId) {
                await updateAdminPlan(editingPlanId, planDraft);
            } else {
                await createAdminPlan(planDraft);
            }

            setPlanDraft(emptyPlanDraft);
            setEditingPlanId(null);
            await loadPlans();
        } catch (error) {
            console.error("Failed to save plan:", error);
        }
    };

    const handlePlanEdit = (plan: AdminPlan) => {
        setEditingPlanId(plan.id);
        setPlanDraft({
            name: plan.name,
            max_projects: plan.max_projects,
            max_members: plan.max_members,
            max_storage_mb: plan.max_storage_mb,
            max_file_size_mb: plan.max_file_size_mb,
            max_tasks_per_project: plan.max_tasks_per_project,
            ai_generations_per_month: plan.ai_generations_per_month,
            ai_tokens_per_month: plan.ai_tokens_per_month,
            price_per_user: plan.price_per_user,
            is_per_seat: plan.is_per_seat,
        });
    };

    const handlePlanDelete = async (planId: string) => {
        try {
            await deleteAdminPlan(planId);
            await loadPlans();
        } catch (error) {
            console.error("Failed to delete plan:", error);
        }
    };

    if (loading) {
        return <div className="rounded-[28px] border border-white/10 bg-[#111827]/60 p-8 text-sm text-slate-300">Loading plans.</div>;
    }

    return (
        <div className="space-y-4">
            <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <Panel
                    eyebrow="Plans"
                    title={editingPlanId ? "Edit subscription plan" : "Create subscription plan"}
                    subtitle="Pricing and tier editing now sit on their own page so they do not compete with owner monitoring tasks."
                >
                    <form className="space-y-4" onSubmit={handlePlanSubmit}>
                        <TextField label="Plan name" value={planDraft.name} onChange={(value) => setPlanDraft((current) => ({ ...current, name: value }))} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <NumberField label="Price per user" value={planDraft.price_per_user} onChange={(value) => setPlanDraft((current) => ({ ...current, price_per_user: value }))} step="0.01" />
                            <NumberField label="Max members" value={planDraft.max_members} onChange={(value) => setPlanDraft((current) => ({ ...current, max_members: value }))} />
                            <NumberField label="Max projects" value={planDraft.max_projects} onChange={(value) => setPlanDraft((current) => ({ ...current, max_projects: value }))} />
                            <NumberField label="Storage (MB)" value={planDraft.max_storage_mb} onChange={(value) => setPlanDraft((current) => ({ ...current, max_storage_mb: value }))} />
                            <NumberField label="Max file size (MB)" value={planDraft.max_file_size_mb} onChange={(value) => setPlanDraft((current) => ({ ...current, max_file_size_mb: value }))} />
                            <NumberField label="Tasks per project" value={planDraft.max_tasks_per_project} onChange={(value) => setPlanDraft((current) => ({ ...current, max_tasks_per_project: value }))} />
                            <NumberField label="AI generations / month" value={planDraft.ai_generations_per_month} onChange={(value) => setPlanDraft((current) => ({ ...current, ai_generations_per_month: value }))} />
                            <NumberField label="AI tokens / month" value={planDraft.ai_tokens_per_month} onChange={(value) => setPlanDraft((current) => ({ ...current, ai_tokens_per_month: value }))} />
                        </div>
                        <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200">
                            <span>Price this plan per seat</span>
                            <ToggleSwitch
                                checked={planDraft.is_per_seat}
                                onClick={() => setPlanDraft((current) => ({ ...current, is_per_seat: !current.is_per_seat }))}
                            />
                        </label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button type="submit" className="rounded-full bg-[#b8adff] px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#c8c1ff]">
                                {editingPlanId ? "Update plan" : "Create plan"}
                            </button>
                            {editingPlanId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingPlanId(null);
                                        setPlanDraft(emptyPlanDraft);
                                    }}
                                    className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </Panel>

                <Panel
                    eyebrow="Catalog"
                    title="Current upgrade tiers"
                    subtitle="A quick inventory of pricing and AI limits attached to each subscription tier."
                >
                    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                        <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search plan name" />
                        <Metric label="Matching plans" value={formatNumber(total)} />
                    </div>

                    <div className="space-y-3">
                        {plans.length === 0 ? (
                            <EmptyState message="No plans match this search yet." />
                        ) : (
                            plans.map((plan) => (
                                <div key={plan.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-medium text-white">{plan.name}</p>
                                            <p className="mt-1 text-sm text-slate-400">
                                                {formatCurrencyIdr(plan.price_per_user)} / {plan.is_per_seat ? "seat" : "workspace"}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handlePlanEdit(plan)}
                                                className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handlePlanDelete(plan.id)}
                                                className="rounded-full border border-[#d56f6f]/20 bg-[#d56f6f]/10 px-3 py-2 text-xs font-semibold text-[#ffc9c9]"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <Metric label="Projects" value={formatNumber(plan.max_projects)} />
                                        <Metric label="Members" value={formatNumber(plan.max_members)} />
                                        <Metric label="AI Tokens" value={formatCompactNumber(plan.ai_tokens_per_month)} />
                                        <Metric label="AI Generations" value={formatCompactNumber(plan.ai_generations_per_month)} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-4">
                        <PaginationControls page={page} totalPages={totalPages} totalItems={total} label="plans" onChange={setPage} />
                    </div>
                </Panel>
            </section>
        </div>
    );
}
