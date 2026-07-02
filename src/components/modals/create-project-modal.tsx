"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import Link from "@/components/app-link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, key: string, description: string, isPrivate: boolean) => void;
    currentCount?: number;
    maxCount?: number;
    teamSlug?: string;
}

export function CreateProjectModal({ isOpen, onClose, onSubmit, currentCount, maxCount, teamSlug }: CreateProjectModalProps) {
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    // Check if limit reached
    const isLimitReached = maxCount !== undefined && currentCount !== undefined && currentCount >= maxCount;
    const usagePercent = maxCount ? Math.min(100, Math.round(((currentCount || 0) / maxCount) * 100)) : 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLimitReached) return;

        setIsLoading(true);
        await onSubmit(name, key, description, isPrivate);
        setIsLoading(false);
        setName("");
        setKey("");
        setDescription("");
        setIsPrivate(false);
        onClose();
    };

    return (
        <ModalShell
            title={isLimitReached ? "Project Limit Reached" : "Create Project"}
            description={isLimitReached ? "This workspace has used all project slots on the current plan." : "Define the next workspace container for your team and keep the structure clean from day one."}
            onClose={onClose}
            maxWidthClassName="max-w-md"
            contentClassName="max-h-[calc(100dvh-2rem)] overflow-hidden"
            bodyClassName="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
                {isLimitReached ? (
                    <div className="space-y-6">
                        <div className="rounded-[1.5rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] p-5 text-[var(--danger-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70">
                                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-slate-950">No project slots left</p>
                                    <p className="mt-1 text-sm leading-6">
                                        You are using {currentCount} of {maxCount} project slots. Upgrade this workspace before creating another project.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[1.35rem] border border-black/5 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-semibold text-slate-900">Project capacity</span>
                                <span className="font-medium text-slate-500">{currentCount}/{maxCount}</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-[var(--danger-fg)]" style={{ width: `${usagePercent}%` }} />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <Button type="button" onClick={onClose} variant="secondary" size="lg" className="flex-1">
                                Close
                            </Button>
                            {teamSlug ? (
                                <Link
                                    href={`/${teamSlug}/settings?plans=1`}
                                    onClick={onClose}
                                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_16px_36px_rgba(109,93,252,0.22)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    Review plan
                                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            ) : null}
                        </div>
                    </div>
                ) : (

                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="space-y-5">
                        <SettingsField label="Project Name">
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Website Redesign"
                                required
                            />
                        </SettingsField>

                        <SettingsField label="Project Key">
                            <Input
                                type="text"
                                value={key}
                                onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 4))}
                                placeholder="WEB"
                                maxLength={4}
                                className="font-mono uppercase"
                                required
                            />
                        </SettingsField>

                        <SettingsField label="Description">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your project..."
                                rows={3}
                                className="resize-none"
                            />
                        </SettingsField>

                        <div
                            role="switch"
                            aria-checked={isPrivate}
                            tabIndex={0}
                            onClick={() => {
                                setIsPrivate(!isPrivate);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") {
                                    return;
                                }

                                event.preventDefault();
                                setIsPrivate((current) => !current);
                            }}
                            className="w-full cursor-pointer rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)] transition-[border-color,background-color,box-shadow] hover:border-slate-200 hover:bg-white aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[14px] font-semibold text-slate-900">Private Project</p>
                                    <p className="mt-1 text-[13px] text-slate-500">Only assigned members can view.</p>
                                </div>
                                <ToggleSwitch checked={isPrivate} disabled={isLimitReached} interactive={false} />
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            size="lg"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name || !key}
                            size="lg"
                            className="flex-1"
                        >
                            {isLoading ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </form>
                )}
        </ModalShell>
    );
}
