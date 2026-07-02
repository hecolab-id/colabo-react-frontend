"use client";

import { useId, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";

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
    children?: ReactNode;
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
    children,
}: ConfirmationDialogProps) {
    const id = useId();
    const titleId = `${id}-title`;
    const descriptionId = `${id}-description`;
    const tone = variant === "danger" ? "danger" : variant === "warning" ? "warning" : "info";

    if (!isOpen) return null;

    return (
        <DialogShell
            onClose={onCancel}
            zIndexClassName="z-[100]"
            maxWidthClassName="max-w-md"
            mobileSheet={false}
            closeOnOverlayClick={!isLoading}
            escapeEnabled={!isLoading}
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="overflow-hidden"
        >
            <div className="p-6">
                <div className="mb-4 flex items-center gap-4">
                    <div className={getIconClassName(tone)}>
                        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 id={titleId} className="text-lg font-semibold text-foreground">{title}</h3>
                    </div>
                </div>

                <p id={descriptionId} className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    {description}
                </p>
                {children ? <div className="mb-6">{children}</div> : null}

                <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button type="button" variant={variant === "danger" ? "danger" : "default"} size="sm" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? "Processing..." : confirmText}
                    </Button>
                </div>
            </div>
        </DialogShell>
    );
}

function getIconClassName(tone: "danger" | "warning" | "info") {
    if (tone === "danger") {
        return "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
    }

    if (tone === "warning") {
        return "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]";
    }

    return "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground";
}
