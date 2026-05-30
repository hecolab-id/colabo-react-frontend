"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import AppLink from "@/components/app-link";

const DISMISSED_KEY = "colabo:email-reminder-banner-dismissed";

// One-time announcement that the weekly email reminder is now turned on by
// default. Hidden once the user dismisses it (persisted in localStorage so
// the same browser does not nag again). Renders nothing on the server / in
// environments without localStorage.
export function EmailReminderBanner() {
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        setMounted(true);
        try {
            setDismissed(window.localStorage.getItem(DISMISSED_KEY) === "1");
        } catch {
            setDismissed(false);
        }
    }, []);

    if (!mounted || dismissed) {
        return null;
    }

    const dismiss = () => {
        try {
            window.localStorage.setItem(DISMISSED_KEY, "1");
        } catch {
            // ignore: a private-mode session simply re-shows the banner next visit.
        }
        setDismissed(true);
    };

    return (
        <div className="mb-4 flex items-start gap-3 rounded-[1rem] border border-primary/15 bg-primary/[0.06] px-4 py-3 sm:items-center">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[13px] leading-5 text-slate-700">
                <span className="font-medium text-slate-900">Pengingat mingguan via email sekarang aktif.</span>{" "}
                Default Senin 07:00 di zona waktu Anda.{" "}
                <AppLink
                    href="/dashboard/settings?tab=notifications"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                >
                    Atur preferensi
                </AppLink>
                .
            </p>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Tutup pengumuman"
                className="-mr-1 shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}
