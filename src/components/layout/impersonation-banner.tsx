"use client";

import { useStore } from "@/lib/store";

export function ImpersonationBanner() {
    const { impersonation, stopImpersonation } = useStore();

    if (!impersonation?.is_active) {
        return null;
    }

    return (
        <div className="sticky top-0 z-50 border-b border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,247,237,0.92))] backdrop-blur-2xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 text-sm text-amber-900">
                <div>
                    <span className="font-semibold text-amber-950">Impersonation active.</span>{" "}
                    Browsing as another user{impersonation.actor_name ? ` from ${impersonation.actor_name}'s superadmin session` : ""}.
                </div>
                <button
                    type="button"
                    onClick={() => void stopImpersonation()}
                    className="rounded-full border border-amber-300/80 bg-white/75 px-4 py-1.5 font-medium text-amber-900 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.35)] transition-colors hover:bg-white"
                >
                    Return to Superadmin
                </button>
            </div>
        </div>
    );
}
