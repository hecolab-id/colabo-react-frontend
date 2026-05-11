"use client";

import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

// isAdminAbortError narrows the catch error to one of the cancellation
// shapes axios / fetch surface when AbortController fires. Promoted out of
// the page files so every admin fetch can share one rule.
export function isAdminAbortError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { code?: string; name?: string };
    return (
        e.code === "ERR_CANCELED" ||
        e.name === "CanceledError" ||
        e.name === "AbortError"
    );
}

export type AdminQueryResult<TData> = {
    data: TData | null;
    // First load with no data yet → page should show full skeleton.
    isInitialLoading: boolean;
    // Subsequent fetch while data is already on screen → page should keep
    // the existing data visible (often dimmed) and surface a small spinner.
    isRefreshing: boolean;
    error: string | null;
    reload: () => void;
};

// useAdminQuery wraps an admin-side fetch call with the patterns every page
// in /admin should follow:
//   - one AbortController per fetch, cancelled on cleanup or dep change;
//   - "two-phase" loading flags so refetches keep prior data visible;
//   - explicit reload() that re-fires without changing deps;
//   - a stable error string for inline retry copy.
//
// `deps` controls when to refetch — pass the same array shape you would to
// useEffect. The hook intentionally re-runs when deps change reference, so
// memoize query objects in the caller (useMemo) before passing them in.
export function useAdminQuery<TData>(
    fetcher: (signal: AbortSignal) => Promise<TData>,
    deps: DependencyList,
    errorMessage = "Couldn't load. Retry?",
): AdminQueryResult<TData> {
    const [data, setData] = useState<TData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    // Track the latest data without making `deps` lie. The `data === null`
    // check derives the two-phase flags from real state, not from a flag
    // someone could forget to flip.
    const dataRef = useRef<TData | null>(null);
    dataRef.current = data;

    useEffect(() => {
        const ac = new AbortController();
        setIsLoading(true);
        setError(null);

        fetcher(ac.signal)
            .then((next) => {
                if (ac.signal.aborted) return;
                setData(next);
            })
            .catch((err) => {
                if (isAdminAbortError(err)) return;
                if (ac.signal.aborted) return;
                setError(errorMessage);
            })
            .finally(() => {
                if (ac.signal.aborted) return;
                setIsLoading(false);
            });

        return () => ac.abort();
        // fetcher and errorMessage are intentionally not in deps — the
        // caller controls refetch via the deps array, and including the
        // closure would refetch on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, reloadTick]);

    const reload = useCallback(() => setReloadTick((t) => t + 1), []);

    return {
        data,
        isInitialLoading: isLoading && data === null,
        isRefreshing: isLoading && data !== null,
        error,
        reload,
    };
}
