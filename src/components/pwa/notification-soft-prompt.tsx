"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { getBrowserPushSettings, saveBrowserPushSubscription } from "@/lib/api";
import { hasCurrentBrowserPushSubscription, isBrowserPushSupported, requestBrowserPushPermissionAndSubscribe } from "@/lib/browser-push";
import {
    isNotificationSoftPromptSnoozed,
    markNotificationSoftPromptAccepted,
    NOTIFICATION_PROMPT_INTENT_EVENT,
    NOTIFICATION_PROMPT_SHOWN_SESSION_KEY,
    snoozeNotificationSoftPrompt,
} from "@/lib/notification-soft-prompt";
import { BrowserPushSettings } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function NotificationSoftPrompt() {
    const user = useStore((state) => state.user);
    const accessToken = useStore((state) => state.accessToken);
    const [settings, setSettings] = useState<BrowserPushSettings | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [message, setMessage] = useState("");

    const dismissPrompt = useCallback(() => {
        snoozeNotificationSoftPrompt();
        setIsVisible(false);
        setMessage("");
    }, []);

    const evaluatePrompt = useCallback(async () => {
        if (!user || !accessToken || !isBrowserPushSupported()) {
            return;
        }

        if (Notification.permission !== "default" || !navigator.onLine) {
            return;
        }

        if (window.sessionStorage.getItem(NOTIFICATION_PROMPT_SHOWN_SESSION_KEY) === "true" || isNotificationSoftPromptSnoozed()) {
            return;
        }

        try {
            const nextSettings = await getBrowserPushSettings();
            if (!nextSettings.is_configured || !nextSettings.is_enabled) {
                return;
            }

            const hasDeviceSubscription = await hasCurrentBrowserPushSubscription();
            if (hasDeviceSubscription) {
                return;
            }

            window.sessionStorage.setItem(NOTIFICATION_PROMPT_SHOWN_SESSION_KEY, "true");
            setSettings(nextSettings);
            setMessage("");
            setIsVisible(true);
        } catch (error) {
            console.error("Failed to prepare notification soft prompt:", error);
        }
    }, [accessToken, user]);

    useEffect(() => {
        const handleIntent = () => {
            void evaluatePrompt();
        };

        window.addEventListener(NOTIFICATION_PROMPT_INTENT_EVENT, handleIntent);
        return () => window.removeEventListener(NOTIFICATION_PROMPT_INTENT_EVENT, handleIntent);
    }, [evaluatePrompt]);

    const handleEnable = async () => {
        if (!settings?.vapid_public_key) {
            return;
        }

        setIsBusy(true);
        setMessage("");

        try {
            const subscription = await requestBrowserPushPermissionAndSubscribe(settings.vapid_public_key);
            if (!subscription) {
                dismissPrompt();
                return;
            }

            await saveBrowserPushSubscription(subscription);
            markNotificationSoftPromptAccepted();
            setIsVisible(false);
        } catch (error) {
            console.error("Failed to enable browser push notifications:", error);
            setMessage("Could not enable notifications. You can try again from Settings.");
        } finally {
            setIsBusy(false);
        }
    };

    if (!isVisible || !settings) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-[75] flex justify-center px-4 md:bottom-6 md:justify-end md:px-6">
            <section
                role="dialog"
                aria-labelledby="notification-soft-prompt-title"
                aria-describedby="notification-soft-prompt-description"
                className={cn(
                    "pointer-events-auto w-full max-w-[25rem] rounded-[1.45rem] border border-white/80 bg-white/96 p-4 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.42)] backdrop-blur-2xl",
                    "md:max-w-[23rem] md:rounded-[1.35rem] md:p-4"
                )}
            >
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Bell className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p id="notification-soft-prompt-title" className="text-[15px] font-semibold tracking-tight text-slate-950">
                                    Stay on top of handoffs
                                </p>
                                <p id="notification-soft-prompt-description" className="mt-1 text-[13px] leading-5 text-slate-500">
                                    Get notified when you are assigned to a task or mentioned in a comment.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={dismissPrompt}
                                className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                                aria-label="Dismiss notification prompt"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>

                        {message ? (
                            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
                                {message}
                            </p>
                        ) : null}

                        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                            <button
                                type="button"
                                onClick={handleEnable}
                                disabled={isBusy}
                                className="inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-[1rem] bg-primary px-4 text-[13px] font-semibold text-white shadow-[0_16px_34px_-24px_rgba(109,93,252,0.7)] transition-all hover:bg-primary/92 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Enable notifications
                            </button>
                            <button
                                type="button"
                                onClick={dismissPrompt}
                                disabled={isBusy}
                                className="h-11 touch-manipulation rounded-[1rem] px-3 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
