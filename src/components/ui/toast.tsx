"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "error" | "success" | "info";
type ToastData = { id: number; tone: ToastTone; message: string; duration: number };

type ToastStore = {
    toasts: ToastData[];
    push: (tone: ToastTone, message: string, duration?: number) => void;
    dismiss: (id: number) => void;
};

let counter = 0;

const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    push: (tone, message, duration) => {
        counter += 1;
        const id = counter;
        const ttl = duration ?? (tone === "error" ? 4500 : 2500);
        set((state) => ({ toasts: [...state.toasts, { id, tone, message, duration: ttl }] }));
    },
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

/** Imperative toast API, callable from any component or handler. */
export const toast = {
    error: (message: string, duration?: number) => useToastStore.getState().push("error", message, duration),
    success: (message: string, duration?: number) => useToastStore.getState().push("success", message, duration),
    info: (message: string, duration?: number) => useToastStore.getState().push("info", message, duration),
};

const toneStyles: Record<ToastTone, string> = {
    error: "border-rose-200 bg-rose-50 text-rose-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-slate-200 bg-white text-slate-700",
};

const toneIcon: Record<ToastTone, LucideIcon> = {
    error: CircleAlert,
    success: CircleCheck,
    info: Info,
};

const toneIconColor: Record<ToastTone, string> = {
    error: "text-rose-500",
    success: "text-emerald-500",
    info: "text-slate-400",
};

function ToastRow({ data, onDismiss }: { data: ToastData; onDismiss: (id: number) => void }) {
    useEffect(() => {
        const timeout = setTimeout(() => onDismiss(data.id), data.duration);
        return () => clearTimeout(timeout);
    }, [data.id, data.duration, onDismiss]);

    const Icon = toneIcon[data.tone];

    return (
        <div
            role={data.tone === "error" ? "alert" : "status"}
            className={cn(
                "toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[0.9rem] border px-3.5 py-3 shadow-[0_18px_50px_-22px_rgba(15,23,42,0.45)]",
                toneStyles[data.tone],
            )}
        >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneIconColor[data.tone])} aria-hidden="true" />
            <p className="flex-1 text-[13px] leading-5">{data.message}</p>
            <button
                type="button"
                onClick={() => onDismiss(data.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
            >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}

/** Mount once near the app root. Renders into a portal, above modals. */
export function Toaster() {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:items-end sm:px-6"
        >
            {toasts.map((data) => (
                <ToastRow key={data.id} data={data} onDismiss={dismiss} />
            ))}
        </div>,
        document.body,
    );
}
