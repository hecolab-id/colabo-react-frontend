"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_PROMPT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const INSTALL_PROMPT_DELAY_MS = 8000;
const INSTALL_PROMPT_DISMISSED_AT_KEY = "colabo-install-prompt-dismissed-at";

export function InstallPrompt() {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();

            const dismissedAt = Number(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_AT_KEY) || "0");
            const isCoolingDown = dismissedAt > 0 && Date.now() - dismissedAt < INSTALL_PROMPT_COOLDOWN_MS;

            if (isCoolingDown) {
                setDismissed(true);
                return;
            }

            setDismissed(false);
            setIsVisible(false);
            setPromptEvent(event as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setPromptEvent(null);
            setDismissed(true);
            setIsVisible(false);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    useEffect(() => {
        if (!promptEvent || dismissed) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setIsVisible(true);
        }, INSTALL_PROMPT_DELAY_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [promptEvent, dismissed]);

    const dismissPrompt = () => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_AT_KEY, String(Date.now()));
        }

        setDismissed(true);
        setIsVisible(false);
    };

    const handleInstall = async () => {
        if (!promptEvent) {
            return;
        }

        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;

        if (outcome === "accepted") {
            setPromptEvent(null);
            setIsVisible(false);
            return;
        }

        dismissPrompt();
    };

    if (!promptEvent || dismissed || !isVisible) {
        return null;
    };

    return (
        <Transition appear show={!!promptEvent && !dismissed && isVisible} as={Fragment}>
            <Dialog as="div" className="relative z-[80]" onClose={dismissPrompt}>
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
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-[28px] border border-sky-200/80 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-7 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                                            Install Colabo
                                        </p>
                                        <Dialog.Title className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight text-slate-950">
                                            Bring your workspace to the home screen.
                                        </Dialog.Title>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={dismissPrompt}
                                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                                        aria-label="Close install prompt"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    Install Colabo for faster launch, standalone mode, and offline access to your cached dashboard and task list.
                                </p>

                                <div className="mt-6 rounded-2xl border border-sky-100 bg-white/80 p-4">
                                    <p className="text-sm font-medium text-slate-900">Why install it?</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Launch Colabo like a native app, reduce browser chrome distractions, and keep your cached dashboard and personal tasks available when the connection drops.
                                    </p>
                                </div>

                                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={dismissPrompt}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                    >
                                        Maybe later
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleInstall}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-dark px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-dark-hover"
                                    >
                                        <Download className="h-4 w-4" />
                                        Install App
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
