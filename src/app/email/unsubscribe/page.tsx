"use client";

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { unsubscribeFromEmailReminder } from "@/lib/api";
import { cn } from "@/lib/utils";

type Phase = "idle" | "loading" | "success" | "error";

// Token-based unsubscribe landing page. Public (no auth). We deliberately
// do NOT unsubscribe on page load. Email security scanners and some
// browsers prefetch GET links; if we acted on mount the user would be
// unsubscribed by an automated probe before they ever saw the page. The
// user has to click the confirm button.
export default function EmailUnsubscribePage() {
    const [searchParams] = useSearchParams();
    const token = (searchParams.get("token") ?? "").trim();
    const [phase, setPhase] = useState<Phase>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!token) {
            setPhase("error");
            setErrorMessage("Token tidak ditemukan di URL.");
            return;
        }
        setPhase("loading");
        setErrorMessage(null);
        try {
            await unsubscribeFromEmailReminder(token);
            setPhase("success");
        } catch {
            setPhase("error");
            setErrorMessage("Gagal memproses. Tautan mungkin sudah kedaluwarsa atau salah. Anda juga bisa berhenti berlangganan dari pengaturan akun setelah login.");
        }
    };

    return (
        <main className="min-h-screen bg-background px-6 py-20 text-foreground">
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400">Email reminder</p>
                </div>

                {phase === "success" ? (
                    <SuccessBlock />
                ) : (
                    <>
                        <div className="space-y-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                                Berhenti berlangganan email pengingat?
                            </h1>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Setelah dikonfirmasi, Anda tidak akan menerima email pengingat mingguan dari Colabo lagi. Anda tetap bisa mengaktifkannya kembali kapan saja dari pengaturan akun.
                            </p>
                        </div>

                        {phase === "error" && errorMessage ? (
                            <div className="flex items-start gap-2.5 rounded-[0.85rem] border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] leading-5 text-rose-900">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <p>{errorMessage}</p>
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={phase === "loading" || !token}
                                className={cn(
                                    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 sm:w-auto",
                                    (phase === "loading" || !token) && "cursor-not-allowed opacity-60",
                                )}
                            >
                                {phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Berhenti berlangganan
                            </button>
                            <a
                                href="/dashboard"
                                className="inline-flex h-11 w-full items-center justify-center px-5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:w-auto"
                            >
                                Batal
                            </a>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

function SuccessBlock() {
    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                        Berhasil berhenti berlangganan.
                    </h1>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                    Anda tidak akan menerima email pengingat mingguan dari Colabo lagi. Kalau berubah pikiran, aktifkan kembali kapan saja dari pengaturan akun.
                </p>
            </div>
            <a
                href="/dashboard/settings?tab=notifications"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto"
            >
                Buka pengaturan
            </a>
        </>
    );
}
