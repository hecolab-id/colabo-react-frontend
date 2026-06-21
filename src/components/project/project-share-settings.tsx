"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
    disableProjectShare,
    enableProjectShare,
    getProjectShare,
    regenerateProjectShare,
    type ProjectShareState,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/ui/settings-section";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { toast } from "@/components/ui/toast";

export function ProjectShareSettings({ projectId, canManage }: { projectId: string; canManage: boolean }) {
    const [share, setShare] = useState<ProjectShareState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showRegenConfirm, setShowRegenConfirm] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        let alive = true;
        setIsLoading(true);
        getProjectShare(projectId)
            .then((data) => {
                if (alive) setShare(data);
            })
            .catch(() => {
                if (alive) toast.error("Couldn't load share settings.");
            })
            .finally(() => {
                if (alive) setIsLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [projectId]);

    const publicUrl = share ? `${window.location.origin}/share/${share.token}` : "";

    const handleToggle = async () => {
        if (!share || isToggling) return;
        setIsToggling(true);
        try {
            const next = share.enabled ? await disableProjectShare(projectId) : await enableProjectShare(projectId);
            setShare(next);
            toast.success(next.enabled ? "Public link enabled." : "Public link disabled.");
        } catch {
            toast.error("Couldn't update the public link.");
        } finally {
            setIsToggling(false);
        }
    };

    const handleCopy = async () => {
        if (!publicUrl) return;
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Couldn't copy the link.");
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const next = await regenerateProjectShare(projectId);
            setShare(next);
            toast.success("New link generated. The old link no longer works.");
        } catch {
            toast.error("Couldn't regenerate the link.");
        } finally {
            setIsRegenerating(false);
            setShowRegenConfirm(false);
        }
    };

    return (
        <SettingsSection
            eyebrow="Sharing"
            title="Public progress page"
            description="Give clients a read-only link to follow progress, no Colabo account needed. You control when it's on."
        >
            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-[var(--surface-raised)] px-4 py-3.5">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                                {share?.enabled ? "Public link is on" : "Public link is off"}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                {share?.enabled
                                    ? "Anyone with the link can view this project's progress."
                                    : "Turn on to create a shareable read-only link."}
                            </p>
                        </div>
                        <ToggleSwitch checked={!!share?.enabled} onClick={handleToggle} disabled={!canManage || isToggling} />
                    </div>

                    {share?.enabled ? (
                        <div className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    value={publicUrl}
                                    readOnly
                                    onFocus={(event) => event.currentTarget.select()}
                                    className="font-mono text-xs"
                                    aria-label="Public progress link"
                                />
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" onClick={handleCopy} className="shrink-0">
                                        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                                        {copied ? "Copied" : "Copy"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                                        className="shrink-0"
                                    >
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open
                                    </Button>
                                </div>
                            </div>
                            {canManage ? (
                                <button
                                    type="button"
                                    onClick={() => setShowRegenConfirm(true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Regenerate link
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-600">What clients can see</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Project name, description, columns, task titles, dates, labels, checklist progress, and assignee
                            first names. Comments, member details, attachments, billing, and AI chat are never shown.
                        </p>
                    </div>

                    {!canManage ? (
                        <p className="text-xs text-slate-400">Only project owners and admins can manage sharing.</p>
                    ) : null}
                </div>
            )}

            <ConfirmationDialog
                isOpen={showRegenConfirm}
                title="Regenerate the public link?"
                description="The current link stops working immediately. Anyone you've shared it with will need the new link."
                confirmText="Regenerate"
                onConfirm={handleRegenerate}
                onCancel={() => setShowRegenConfirm(false)}
                isLoading={isRegenerating}
                variant="warning"
            />
        </SettingsSection>
    );
}
