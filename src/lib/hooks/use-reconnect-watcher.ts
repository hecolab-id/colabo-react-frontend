import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export type ReconnectStatus = "offline" | "checking" | "reconnected";

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const PING_TIMEOUT_MS = 4000;
const HEALTH_PATH = "/health-check/";

export async function pingHealth(timeoutMs: number = PING_TIMEOUT_MS): Promise<boolean> {
    const abort = new AbortController();
    const timeoutHandle = window.setTimeout(() => abort.abort(), timeoutMs);
    try {
        const response = await fetch(`${API_BASE_URL}${HEALTH_PATH}`, {
            method: "GET",
            cache: "no-store",
            signal: abort.signal,
        });
        return response.ok;
    } catch {
        return false;
    } finally {
        window.clearTimeout(timeoutHandle);
    }
}

export function useReconnectWatcher(): ReconnectStatus {
    const [status, setStatus] = useState<ReconnectStatus>(() => {
        if (typeof navigator === "undefined") {
            return "checking";
        }
        return navigator.onLine ? "checking" : "offline";
    });

    useEffect(() => {
        let cancelled = false;
        let nextTimeoutId: number | null = null;
        let backoff = INITIAL_BACKOFF_MS;

        const clearNextTimeout = () => {
            if (nextTimeoutId !== null) {
                window.clearTimeout(nextTimeoutId);
                nextTimeoutId = null;
            }
        };

        const scheduleNext = () => {
            clearNextTimeout();
            const delay = backoff;
            backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
            nextTimeoutId = window.setTimeout(() => {
                void run();
            }, delay);
        };

        const run = async () => {
            if (cancelled) {
                return;
            }

            const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;
            if (!browserOnline) {
                setStatus("offline");
                scheduleNext();
                return;
            }

            setStatus((prev) => (prev === "reconnected" ? prev : "checking"));
            const ok = await pingHealth();

            if (cancelled) {
                return;
            }

            if (ok) {
                setStatus("reconnected");
                return;
            }

            setStatus("offline");
            scheduleNext();
        };

        const handleOnline = () => {
            backoff = INITIAL_BACKOFF_MS;
            clearNextTimeout();
            void run();
        };

        const handleOffline = () => {
            backoff = INITIAL_BACKOFF_MS;
            clearNextTimeout();
            setStatus("offline");
            scheduleNext();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        void run();

        return () => {
            cancelled = true;
            clearNextTimeout();
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return status;
}
