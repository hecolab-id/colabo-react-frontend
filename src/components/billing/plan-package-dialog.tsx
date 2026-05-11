"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Check, CreditCard, Sparkles, X } from "lucide-react";
import { Plan } from "@/lib/types";

interface PlanPackageDialogProps {
    isOpen: boolean;
    plans: Plan[];
    selectedPlanId: string;
    currentPlanId?: string;
    isLoading?: boolean;
    currentMemberCount?: number;
    onClose: () => void;
    onConfirm: () => void;
    onSelectPlan: (planId: string) => void;
}

function formatPlanPrice(plan: Plan) {
    if (plan.price_per_user <= 0) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(plan.price_per_user);
}

function getPlanFeatures(plan: Plan) {
    return [
        `${plan.max_projects} projects`,
        `${plan.max_members} members`,
        `${plan.max_storage_mb >= 1024 ? `${Math.round(plan.max_storage_mb / 1024)} GB` : `${plan.max_storage_mb} MB`} storage`,
        `${plan.ai_generations_per_month ?? 0} AI prompts / month`,
    ];
}

export function PlanPackageDialog({
    isOpen,
    plans,
    selectedPlanId,
    currentPlanId,
    isLoading = false,
    currentMemberCount = 1,
    onClose,
    onConfirm,
    onSelectPlan,
}: PlanPackageDialogProps) {
    const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || null;
    const canCheckout = !!selectedPlan && selectedPlan.price_per_user > 0;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[90]" onClose={isLoading ? () => undefined : onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-2 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-2 sm:scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
                                <div className="border-b border-slate-200/80 px-6 py-5 sm:px-8">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-dark px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                                Package Plan
                                            </div>
                                            <Dialog.Title className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                                                Choose the workspace package before checkout
                                            </Dialog.Title>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                                Plans below come from your live billing catalog, so changes in admin will show up here automatically.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isLoading}
                                            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                                            aria-label="Close package plans"
                                        >
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-2">
                                    {plans.map((plan) => {
                                        const isSelected = plan.id === selectedPlanId;
                                        const isCurrent = plan.id === currentPlanId;

                                        return (
                                            <button
                                                key={plan.id}
                                                type="button"
                                                onClick={() => onSelectPlan(plan.id)}
                                                className={`rounded-[24px] border p-6 text-left shadow-sm transition ${
                                                    isSelected
                                                        ? "border-primary-dark bg-primary-dark text-white"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                                            isSelected ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-600"
                                                        }`}>
                                                            {plan.name}
                                                        </div>
                                                        <h3 className="mt-4 text-2xl font-semibold">
                                                            {formatPlanPrice(plan)} / {plan.is_per_seat ? "seat" : "workspace"}
                                                        </h3>
                                                        <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                                                            {plan.price_per_user > 0
                                                                ? "Recommended when the workspace is ready to grow."
                                                                : "Best for early-stage teams staying on the free package."}
                                                        </p>
                                                    </div>
                                                    {isCurrent ? (
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-emerald-500/20 text-emerald-200" : "bg-emerald-50 text-emerald-600"}`}>
                                                            Current
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="mt-6 space-y-3">
                                                    {getPlanFeatures(plan).map((feature) => (
                                                        <div key={feature} className="flex items-center gap-3 text-sm">
                                                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-500/15 text-emerald-500"}`}>
                                                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                                            </div>
                                                            <span>{feature}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t border-slate-200/80 bg-white/80 px-6 py-5 sm:px-8">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-slate-600">
                                            {selectedPlan
                                                ? selectedPlan.price_per_user > 0
                                                    ? `Checkout will be created for ${currentMemberCount} member${currentMemberCount === 1 ? "" : "s"} on ${selectedPlan.name}.`
                                                    : `${selectedPlan.name} is a non-billable package, so no checkout is needed.`
                                                : "Select a package to continue."}
                                        </p>
                                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={isLoading}
                                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                Maybe later
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onConfirm}
                                                disabled={isLoading || !canCheckout}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-dark px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark-hover disabled:opacity-50"
                                            >
                                                <CreditCard className="h-4 w-4" aria-hidden="true" />
                                                {isLoading ? "Preparing checkout..." : "Continue to checkout"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
