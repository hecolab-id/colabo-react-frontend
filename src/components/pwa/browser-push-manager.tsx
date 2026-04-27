"use client";

import { useEffect } from "react";
import { getBrowserPushSettings, saveBrowserPushSubscription } from "@/lib/api";
import { ensureBrowserPushSubscription, isBrowserPushSupported } from "@/lib/browser-push";
import { useStore } from "@/lib/store";

export function BrowserPushManager() {
    const user = useStore((state) => state.user);
    const accessToken = useStore((state) => state.accessToken);

    useEffect(() => {
        if (!user || !accessToken || !isBrowserPushSupported()) {
            return;
        }

        let isCancelled = false;

        const syncBrowserPush = async () => {
            try {
                const settings = await getBrowserPushSettings();
                if (isCancelled || !settings.is_configured || !settings.is_enabled) {
                    return;
                }

                if (Notification.permission === "granted") {
                    const subscription = await ensureBrowserPushSubscription(settings.vapid_public_key);
                    if (subscription && !isCancelled) {
                        await saveBrowserPushSubscription(subscription);
                    }
                    return;
                }

                // Permission is requested from Settings only. This background
                // sync keeps an already-approved device registered without
                // surprising users with a browser prompt on page load.
            } catch (error) {
                console.error("Failed to initialize browser push notifications:", error);
            }
        };

        syncBrowserPush();

        return () => {
            isCancelled = true;
        };
    }, [accessToken, user]);

    return null;
}
