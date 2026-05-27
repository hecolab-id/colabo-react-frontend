"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Undo2, Wand2, X } from "lucide-react";
import { refineTaskTitle } from "@/lib/api";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "error";

type ToastState = { tone: ToastTone; text: string };

export type AiTitleRefineState = {
    canRefine: boolean;
    isRefining: boolean;
    originalBeforeRefine: string | null;
    toast: ToastState | null;
    refine: () => Promise<void>;
    undo: () => void;
    dismissBanner: () => void;
    dismissToast: () => void;
};

type UseAiTitleRefineOptions = {
    value: string;
    onChange: (next: string) => void;
    teamId?: string;
    minLength?: number;
};

export function useAiTitleRefine({
    value,
    onChange,
    teamId,
    minLength = 3,
}: UseAiTitleRefineOptions): AiTitleRefineState {
    const [originalBeforeRefine, setOriginalBeforeRefine] = useState<string | null>(null);
    const [isRefining, setIsRefining] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const lastRefinedRef = useRef<string | null>(null);
    const toastTimerRef = useRef<number | null>(null);
    const bannerTimerRef = useRef<number | null>(null);

    const canRefine = useMemo(
        () => Boolean(teamId) && value.trim().length >= minLength && !isRefining,
        [teamId, value, minLength, isRefining],
    );

    const showToast = useCallback((next: ToastState) => {
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
        setToast(next);
        toastTimerRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, 3500);
    }, []);

    const scheduleBannerDismiss = useCallback(() => {
        if (bannerTimerRef.current !== null) {
            window.clearTimeout(bannerTimerRef.current);
        }
        bannerTimerRef.current = window.setTimeout(() => {
            setOriginalBeforeRefine(null);
            lastRefinedRef.current = null;
            bannerTimerRef.current = null;
        }, 12000);
    }, []);

    const clearBanner = useCallback(() => {
        if (bannerTimerRef.current !== null) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
        setOriginalBeforeRefine(null);
        lastRefinedRef.current = null;
    }, []);

    const refine = useCallback(async () => {
        if (!canRefine || !teamId) {
            return;
        }
        setIsRefining(true);
        try {
            const result = await refineTaskTitle(value.trim(), teamId);
            const refined = result.refined.trim();
            if (!result.changed || refined === value.trim()) {
                showToast({ tone: "info", text: "Judul sudah jelas." });
                return;
            }
            setOriginalBeforeRefine(value);
            lastRefinedRef.current = refined;
            onChange(refined);
            scheduleBannerDismiss();
        } catch {
            showToast({ tone: "error", text: "Gagal merefine judul. Coba lagi." });
        } finally {
            setIsRefining(false);
        }
    }, [canRefine, teamId, value, onChange, showToast, scheduleBannerDismiss]);

    const undo = useCallback(() => {
        if (originalBeforeRefine === null) return;
        onChange(originalBeforeRefine);
        clearBanner();
    }, [originalBeforeRefine, onChange, clearBanner]);

    useEffect(() => {
        if (
            originalBeforeRefine !== null &&
            lastRefinedRef.current !== null &&
            value !== lastRefinedRef.current
        ) {
            clearBanner();
        }
    }, [value, originalBeforeRefine, clearBanner]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
            }
            if (bannerTimerRef.current !== null) {
                window.clearTimeout(bannerTimerRef.current);
            }
        };
    }, []);

    return {
        canRefine,
        isRefining,
        originalBeforeRefine,
        toast,
        refine,
        undo,
        dismissBanner: clearBanner,
        dismissToast: () => setToast(null),
    };
}

export function AiTitleRefineButton({
    state,
    className,
    size = "md",
    "aria-label": ariaLabel,
}: {
    state: AiTitleRefineState;
    className?: string;
    size?: "sm" | "md";
    "aria-label"?: string;
}) {
    const dimensions = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
        <button
            type="button"
            onClick={state.refine}
            disabled={!state.canRefine}
            aria-label={ariaLabel ?? "Perhalus judul dengan AI"}
            aria-busy={state.isRefining}
            title="Perhalus judul"
            className={cn(
                "inline-flex items-center justify-center rounded-[0.7rem] text-primary transition-colors",
                "hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                "disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                dimensions,
                className,
            )}
        >
            {state.isRefining ? (
                <Loader2 className={cn("animate-spin", iconSize)} aria-hidden="true" />
            ) : (
                <Wand2 className={iconSize} aria-hidden="true" />
            )}
        </button>
    );
}

export function AiTitleRefineBanner({ state, className }: { state: AiTitleRefineState; className?: string }) {
    if (state.toast) {
        return (
            <div
                role="status"
                aria-live="polite"
                className={cn(
                    "flex items-start justify-between gap-3 rounded-[0.85rem] px-3 py-2 text-[13px]",
                    state.toast.tone === "error"
                        ? "border border-rose-200 bg-rose-50 text-rose-900"
                        : "border border-slate-200 bg-slate-50 text-slate-700",
                    className,
                )}
            >
                <span className="leading-5">{state.toast.text}</span>
                <button
                    type="button"
                    onClick={state.dismissToast}
                    aria-label="Tutup notifikasi"
                    className="-mr-1 mt-0.5 text-slate-400 transition-colors hover:text-slate-700"
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>
        );
    }

    if (state.originalBeforeRefine !== null) {
        return (
            <div
                role="status"
                aria-live="polite"
                className={cn(
                    "flex items-start gap-2.5 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-700",
                    className,
                )}
            >
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                    AI merefine dari{" "}
                    <span className="font-medium text-slate-900">{`"${truncate(state.originalBeforeRefine, 60)}"`}</span>.
                </span>
                <button
                    type="button"
                    onClick={state.undo}
                    className="inline-flex shrink-0 items-center gap-1 rounded-[0.55rem] px-2 py-1 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <Undo2 className="h-3 w-3" aria-hidden="true" />
                    Undo
                </button>
                <button
                    type="button"
                    onClick={state.dismissBanner}
                    aria-label="Tutup notifikasi"
                    className="-mr-1 shrink-0 text-slate-400 transition-colors hover:text-slate-700"
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>
        );
    }

    return null;
}

function truncate(text: string, limit: number) {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trimEnd()}…`;
}
