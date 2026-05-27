import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Link from "@/components/app-link";
import { useReconnectWatcher, type ReconnectStatus } from "@/lib/hooks/use-reconnect-watcher";

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
                // sessionStorage may be unavailable in some privacy modes — fall back to default.
            }

            window.dispatchEvent(new CustomEvent(CONNECTION_RESTORED_EVENT));
            navigate(target, { replace: true });
        }, REDIRECT_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [status, navigate]);

    const title = status === "reconnected" ? "Tersambung kembali." : "Tersambung lagi sebentar.";
    const description = status === "reconnected"
        ? "Mengarahkan kembali ke halaman Anda."
        : "Kami akan mengembalikan Anda begitu koneksi pulih. Sementara itu, Dashboard dan tugas yang tersimpan masih bisa dibuka.";

    return (
        <main className="min-h-screen bg-background px-6 py-20 text-foreground">
            <div className="mx-auto flex w-full max-w-md flex-col gap-7">
                <div role="status" aria-live="polite" className="flex items-center gap-2.5">
                    <StatusDot status={status} />
                    <span className="text-sm font-medium text-slate-700">{statusLabel(status)}</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                        {title}
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-600">
                        {description}
                    </p>
                </div>

                <div className="h-px w-full bg-slate-200/80" />

                <nav aria-label="Halaman tersedia offline" className="flex flex-col">
                    <OfflineLink href="/dashboard">Buka Dashboard tersimpan</OfflineLink>
                    <OfflineLink href="/my-tasks">Buka Tugas saya</OfflineLink>
                </nav>

                <p className="text-xs text-slate-500">
                    Akan otomatis kembali ke halaman Anda saat koneksi pulih.
                </p>
            </div>
        </main>
    );
}

function StatusDot({ status }: { status: ReconnectStatus }) {
    if (status === "offline") {
        return <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-rose-500" />;
    }
    if (status === "checking") {
        return (
            <span aria-hidden="true" className="relative block h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-amber-500" />
                <span className="absolute inset-0 rounded-full bg-amber-500/60 motion-safe:animate-ping" />
            </span>
        );
    }
    return <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-emerald-500" />;
}

function statusLabel(status: ReconnectStatus) {
    if (status === "offline") {
        return "Tidak tersambung.";
    }
    if (status === "checking") {
        return "Memeriksa koneksi…";
    }
    return "Tersambung kembali.";
}

function OfflineLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="group -mx-2 flex items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
            <span>{children}</span>
            <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700"
            />
        </Link>
    );
}
