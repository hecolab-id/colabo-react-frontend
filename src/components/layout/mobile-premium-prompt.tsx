"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useRouter } from "@/lib/navigation";
import { isPaidSubscription } from "@/lib/billing";
import { Team } from "@/lib/types";

const MOBILE_PREMIUM_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_PREMIUM_PROMPT_DISMISSED_AT_KEY = "colabo-mobile-premium-prompt-dismissed-at";

export function MobilePremiumPrompt({ team }: { team: Team | null }) {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const isEligible = useMemo(
        () => !!team && !isPaidSubscription(team.subscription?.status),
        [team]
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(max-width: 767px)");
        const updateViewport = () => setIsMobile(mediaQuery.matches);

        updateViewport();
        mediaQuery.addEventListener("change", updateViewport);

        return () => {
            mediaQuery.removeEventListener("change", updateViewport);
        };
    }, []);

    useEffect(() => {
        if (!isMobile || !isEligible) {
            return;
        }

        const dismissedAt = Number(window.localStorage.getItem(MOBILE_PREMIUM_PROMPT_DISMISSED_AT_KEY) || "0");
        const isCoolingDown = dismissedAt > 0 && Date.now() - dismissedAt < MOBILE_PREMIUM_PROMPT_COOLDOWN_MS;

        if (isCoolingDown) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setIsVisible(true);
        }, 1200);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isEligible, isMobile]);

    const dismissPrompt = () => {
        window.localStorage.setItem(MOBILE_PREMIUM_PROMPT_DISMISSED_AT_KEY, String(Date.now()));
        setIsVisible(false);
    };

    const openPlans = () => {
        if (!team) return;
        dismissPrompt();
        router.push(`/${team.slug}/settings?plans=1`);
    };

    if (!team || !isMobile || !isEligible || !isVisible) {
        return null;
    }

    return (
        <Transition appear show={isVisible} as={Fragment}>
            <Dialog as="div" className="relative z-[85] md:hidden" onClose={dismissPrompt}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">
                                            Colabo Premium
                                        </p>
                                        <Dialog.Title className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950">
                                            Unlock more room for your next projects.
                                        </Dialog.Title>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={dismissPrompt}
                                        aria-label="Close premium prompt"
                                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    Upgrade this workspace when you need more projects, more members, and more breathing room for the team.
                                </p>

                                <div className="mt-6 rounded-[24px] border border-slate-200 bg-white/85 p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                                        Why teams upgrade
                                    </div>
                                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                        <div className="rounded-2xl bg-slate-50 px-3 py-2">Unlimited project rooms for growing workstreams</div>
                                        <div className="rounded-2xl bg-slate-50 px-3 py-2">More members, storage, and AI usage as the team expands</div>
                                        <div className="rounded-2xl bg-slate-50 px-3 py-2">A cleaner path to scale without hitting free-plan ceilings</div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={dismissPrompt}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                    >
                                        Maybe later
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openPlans}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-dark px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    >
                                        Explore plans
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
