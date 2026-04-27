"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        const registerServiceWorker = () => {
            navigator.serviceWorker.register("/sw.js")
                .then((registration) => {
                    registration.update().catch(() => {
                        // Ignore update probes; the active worker still handles offline fallback.
                    });
                })
                .catch((error) => {
                    console.error("Failed to register service worker:", error);
                });
        };

        if (document.readyState === "complete") {
            registerServiceWorker();
            return;
        }

        window.addEventListener("load", registerServiceWorker, { once: true });

        return () => {
            window.removeEventListener("load", registerServiceWorker);
        };
    }, []);

    return null;
}
