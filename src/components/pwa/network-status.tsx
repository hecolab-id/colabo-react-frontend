import { useEffect, useState } from "react";
import { pingHealth } from "@/lib/hooks/use-reconnect-watcher";

const OFFLINE_ACTION_EVENT = "colabo:offline-action-blocked";
const CONNECTION_RESTORED_EVENT = "colabo:connection-restored";

type BannerState = {
    tone: "warning" | "success";
    message: string;
};

export function NetworkStatus() {
    const [banner, setBanner] = useState<BannerState | null>(null);

    useEffect(() => {
        let timeoutId: number | null = null;

        const showBanner = (nextBanner: BannerState, duration: number) => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            setBanner(nextBanner);
            timeoutId = window.setTimeout(() => setBanner(null), duration);
        };

        const showOffline = () => showBanner({
            tone: "warning",
            message: "You're offline. Only cached dashboard and task views are available.",
        }, 5000);

        const showConnected = () => showBanner({
            tone: "success",
            message: "You're back online.",
        }, 4000);

        const handleOfflineActionBlocked = (event: Event) => {
            const detail = (event as CustomEvent<{ message?: string }>).detail;
            showBanner({
                tone: "warning",
                message: detail?.message || "This action requires an internet connection.",
            }, 5000);
        };

        const handleBrowserOnline = async () => {
            const ok = await pingHealth();
            if (ok) {
                showConnected();
            }
        };

        window.addEventListener("offline", showOffline);
        window.addEventListener("online", handleBrowserOnline);
        window.addEventListener(CONNECTION_RESTORED_EVENT, showConnected);
        window.addEventListener(OFFLINE_ACTION_EVENT, handleOfflineActionBlocked as EventListener);

        if (!navigator.onLine) {
            showOffline();
        }

        return () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            window.removeEventListener("offline", showOffline);
            window.removeEventListener("online", handleBrowserOnline);
            window.removeEventListener(CONNECTION_RESTORED_EVENT, showConnected);
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
            <div
                role="status"
                aria-live="polite"
                className={`pointer-events-auto rounded-full border px-4 py-2 text-sm font-medium shadow-lg ${toneClasses}`}
            >
                {banner.message}
            </div>
        </div>
    );
}
