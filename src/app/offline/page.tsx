import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Link from "@/components/app-link";
import { useReconnectWatcher } from "@/lib/hooks/use-reconnect-watcher";

const REDIRECT_DELAY_MS = 400;
const INTENDED_PATH_KEY = "colabo:intended-path";
const CONNECTION_RESTORED_EVENT = "colabo:connection-restored";
const DEFAULT_REDIRECT = "/dashboard";

export default function OfflinePage() {
    const status = useReconnectWatcher();
    const navigate = useNavigate();
    const hasNavigatedRef = useRef(false);

    useEffect(() => {
        if (status !== "reconnected" || hasNavigatedRef.current) {
            return;
        }
        hasNavigatedRef.current = true;

        const timer = window.setTimeout(() => {
            let target = DEFAULT_REDIRECT;
            try {
                const stored = sessionStorage.getItem(INTENDED_PATH_KEY);
                if (stored && stored !== "/offline" && stored.startsWith("/")) {
                    target = stored;
                }
                sessionStorage.removeItem(INTENDED_PATH_KEY);
            } catch {
                // sessionStorage may be unavailable; fall back to default.
            }
            window.dispatchEvent(new CustomEvent(CONNECTION_RESTORED_EVENT));
            navigate(target, { replace: true });
        }, REDIRECT_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [status, navigate]);

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-16 text-slate-950">
            <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center">
                <div className="rounded-[32px] border border-slate-200/90 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                        Offline Mode
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                        You&apos;re offline right now.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                        Colabo can still open your cached dashboard and personal task list, but project boards,
                        team areas, and any task or project changes need an internet connection.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <Link
                            href="/dashboard"
                            className="rounded-2xl border border-slate-200 bg-primary-dark px-5 py-4 text-sm font-medium text-white transition hover:bg-primary-dark-hover"
                        >
                            Open Dashboard
                        </Link>
                        <Link
                            href="/my-tasks"
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
                        >
                            Open My Tasks
                        </Link>
                    </div>

                    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        Creating, editing, deleting, or reordering tasks and projects is disabled while offline.
                    </div>
                </div>
            </div>
        </main>
    );
}
