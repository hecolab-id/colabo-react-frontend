"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SettingsField } from "@/components/ui/settings-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, key: string, description: string, isPrivate: boolean) => void;
    currentCount?: number;
    maxCount?: number;
}

export function CreateProjectModal({ isOpen, onClose, onSubmit, currentCount, maxCount }: CreateProjectModalProps) {
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    // Check if limit reached
    const isLimitReached = maxCount !== undefined && currentCount !== undefined && currentCount >= maxCount;

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
            title="Create Project"
            description="Define the next workspace container for your team and keep the structure clean from day one."
            onClose={onClose}
            maxWidthClassName="max-w-md"
        >
                {isLimitReached && (
                    <Alert variant="danger" className="mb-6">
                        <AlertTitle>Project Limit Reached</AlertTitle>
                        <AlertDescription>
                            You have reached the limit of {maxCount} projects on your current plan.
                            Please upgrade to Pro for unlimited projects.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset disabled={isLimitReached} className="space-y-5">
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
                                onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 5))}
                                placeholder="WEB"
                                maxLength={5}
                                className="font-mono uppercase"
                                required
                            />
                        </SettingsField>

                        <SettingsField label="Description">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your project..."
                                rows={3}
                                className="w-full resize-none rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            />
                        </SettingsField>

                        <button
                            type="button"
                            onClick={() => setIsPrivate(!isPrivate)}
                            disabled={isLimitReached}
                            className="w-full rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)] transition-[border-color,background-color,box-shadow] hover:border-slate-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[14px] font-semibold text-slate-900">Private Project</p>
                                    <p className="mt-1 text-[13px] text-slate-500">Only assigned members can view.</p>
                                </div>
                                <ToggleSwitch checked={isPrivate} disabled={isLimitReached} />
                            </div>
                        </button>
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
                            disabled={isLoading || !name || !key || isLimitReached}
                            size="lg"
                            className="flex-1"
                        >
                            {isLimitReached ? "Limit Reached" : (isLoading ? "Creating..." : "Create Project")}
                        </Button>
                    </div>
                </form>
        </ModalShell>
    );
}
