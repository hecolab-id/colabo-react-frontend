"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: "danger" | "warning" | "info";
}

export function ConfirmationDialog({
    isOpen,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isLoading = false,
    variant = "danger",
}: ConfirmationDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useEscapeKey(isOpen && !isLoading, onCancel);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                        </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-opacity disabled:opacity-50 ${variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-primary hover:bg-primary/90'
                                }`}
                        >
                            {isLoading ? "Processing..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
