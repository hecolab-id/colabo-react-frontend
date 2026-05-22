"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AdminPlan, AdminTeamRow } from "@/lib/types";

type Props = {
    team: AdminTeamRow | null;
    open: boolean;
    onClose: () => void;
    plans: AdminPlan[];
    draft: { status: string; plan_id?: string };
    onChange: (field: "status" | "plan_id", value: string) => void;
    onSave: () => void;
    saving: boolean;
};

const STATUS_OPTIONS = [
    { value: "PENDING", label: "Pending" },
    { value: "SUBSCRIPTION", label: "Subscription" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "EXPIRED", label: "Expired" },
];

export function TeamEditDrawer({ team, open, onClose, plans, draft, onChange, onSave, saving }: Props) {
    const planSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => planSelectRef.current?.focus(), 100);

        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = previousOverflow;
            window.clearTimeout(focusTimer);
        };
    }, [open, onClose]);

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-200 ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!open}
        >
            <div
                className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby={team ? "team-drawer-title" : undefined}
                className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-black/5 bg-white shadow-glass transition-transform duration-300 ease-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <header className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Edit subscription
                        </p>
                        <h2
                            id="team-drawer-title"
                            className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground"
                        >
                            {team?.name || "Team"}
                        </h2>
                        {team ? (
                            <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                                {team.owner_email}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/5 bg-white text-muted-foreground transition hover:bg-muted"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Plan</span>
                        <select
                            ref={planSelectRef}
                            value={draft.plan_id || plans[0]?.id || ""}
                            onChange={(event) => onChange("plan_id", event.target.value)}
                            disabled={!team}
                            className="h-11 w-full rounded-[12px] border border-border bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            Plan changes apply on next billing cycle.
                        </p>
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-foreground">Subscription status</span>
                        <select
                            value={draft.status || "PENDING"}
                            onChange={(event) => onChange("status", event.target.value)}
                            disabled={!team}
                            className="h-11 w-full rounded-[12px] border border-border bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-black/5 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-full px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving || !team}
                        className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-18px_rgba(109,93,252,0.55)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </footer>
            </aside>
        </div>
    );
}
