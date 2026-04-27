"use client";

import { useEffect, useState } from "react";

const OFFLINE_ACTION_EVENT = "colabo:offline-action-blocked";

type BannerState = {
    tone: "warning" | "success";
    message: string;
};

export function NetworkStatus() {
    const [banner, setBanner] = useState<BannerState | null>(null);

    useEffect(() => {
        let timeoutId: number | null = null;

        const showBanner = (nextBanner: BannerState, duration = 4000) => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            setBanner(nextBanner);
            timeoutId = window.setTimeout(() => {
                setBanner(null);
            }, duration);
        };

        const handleOffline = () => {
            showBanner({
                tone: "warning",
                message: "You're offline. Only cached dashboard and task views are available.",
            }, 5000);
        };

        const handleOnline = () => {
            showBanner({
                tone: "success",
                message: "You're back online.",
            });
        };

        const handleOfflineActionBlocked = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string }>;
            showBanner({
                tone: "warning",
                message: customEvent.detail?.message || "This action requires an internet connection.",
            }, 5000);
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);
        window.addEventListener(OFFLINE_ACTION_EVENT, handleOfflineActionBlocked as EventListener);

        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener(OFFLINE_ACTION_EVENT, handleOfflineActionBlocked as EventListener);
        };
    }, []);

    if (!banner) {
        return null;
    }

    const toneClasses = banner.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-950";

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
            <div className={`pointer-events-auto rounded-full border px-4 py-2 text-sm font-medium shadow-lg ${toneClasses}`}>
                {banner.message}
            </div>
        </div>
    );
}
