import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        <main className="min-h-screen bg-background px-6 py-16 text-foreground">
            <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center">
                <Card variant="elevated" padding="lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Offline Mode
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                        You&apos;re offline right now.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        Colabo can still open your cached dashboard and personal task list, but project boards,
                        team areas, and any task or project changes need an internet connection.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <Button asChild size="lg" className="justify-start">
                            <Link href="/dashboard">Open Dashboard</Link>
                        </Button>
                        <Button asChild variant="secondary" size="lg" className="justify-start">
                            <Link href="/my-tasks">Open My Tasks</Link>
                        </Button>
                    </div>

                    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        Creating, editing, deleting, or reordering tasks and projects is disabled while offline.
                    </div>
                </Card>
            </div>
        </main>
    );
}
