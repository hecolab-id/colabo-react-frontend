"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { createLabel, deleteLabel, getTeamLabels, addLabelToTask, removeLabelFromTask } from "@/lib/api";
import { LabelBadge } from "@/components/ui/label-badge";
import { cn } from "@/lib/utils";
import { Label } from "@/lib/types";

interface LabelSelectorProps {
    taskId: string;
    teamSlug: string;
    currentLabels: Label[];
    onUpdate: () => void;
    canManageLabels?: boolean;
}

export function LabelSelector({ taskId, teamSlug, currentLabels, onUpdate, canManageLabels = false }: LabelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newLabelName, setNewLabelName] = useState("");
    const [selectedColor, setSelectedColor] = useState("#6366F1");
    const [isCreating, setIsCreating] = useState(false);
    const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const colorOptions = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#64748B"];

    useEffect(() => {
        if (isOpen) {
            loadLabels();
        }
    }, [isOpen, teamSlug]);

    const loadLabels = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const labels = await getTeamLabels(teamSlug);
            setAllLabels(Array.isArray(labels) ? labels : []);
        } catch (error) {
            console.error("Failed to load labels:", error);
            setAllLabels([]);
            setErrorMessage("Labels could not be loaded.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLabel = async (labelId: string) => {
        try {
            await addLabelToTask(taskId, labelId);
            onUpdate();
        } catch (error) {
            console.error("Failed to add label:", error);
            setErrorMessage("Label could not be added to this task.");
        }
    };

    const handleRemoveLabel = async (labelId: string) => {
        try {
            await removeLabelFromTask(taskId, labelId);
            onUpdate();
        } catch (error) {
            console.error("Failed to remove label:", error);
            setErrorMessage("Label could not be removed from this task.");
        }
    };

    const handleCreateLabel = async () => {
        const trimmedName = newLabelName.trim();
        if (!trimmedName) return;

        setIsCreating(true);
        setErrorMessage(null);
        try {
            const createdLabel = await createLabel(teamSlug, trimmedName, selectedColor);
            await addLabelToTask(taskId, createdLabel.id);
            setAllLabels((current) => [...current, createdLabel].sort((left, right) => left.name.localeCompare(right.name)));
            setNewLabelName("");
            onUpdate();
        } catch (error) {
            console.error("Failed to create label:", error);
            setErrorMessage("Label could not be created.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteWorkspaceLabel = async (label: Label) => {
        if (!canManageLabels) return;
        if (!confirm(`Delete "${label.name}" from this workspace? This only works when the label is not used by any task.`)) {
            return;
        }

        setDeletingLabelId(label.id);
        setErrorMessage(null);
        try {
            await deleteLabel(label.id);
            setAllLabels((current) => current.filter((item) => item.id !== label.id));
            onUpdate();
        } catch (error) {
            console.error("Failed to delete label:", error);
            setErrorMessage("Label could not be deleted. It may still be used by a task.");
        } finally {
            setDeletingLabelId(null);
        }
    };

    const isLabelSelected = (labelId: string) => {
        return currentLabels.some((l) => l.id === labelId);
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
                {currentLabels.map((label) => (
                    <LabelBadge
                        key={label.id}
                        label={label}
                        size="sm"
                        onRemove={() => handleRemoveLabel(label.id)}
                    />
                ))}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-slate-200 bg-white/82 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-[border-color,background-color,color] hover:border-primary/25 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add label
                </button>
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/96 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.62)] backdrop-blur-xl">
                        {canManageLabels ? (
                            <div className="border-b border-slate-200/70 p-3">
                                <label htmlFor="new-task-label" className="mb-2 block text-xs font-medium text-slate-500">
                                    Create workspace label
                                </label>
                                <input
                                    id="new-task-label"
                                    name="new_task_label"
                                    type="text"
                                    value={newLabelName}
                                    onChange={(event) => setNewLabelName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleCreateLabel();
                                        }
                                    }}
                                    placeholder="Label name..."
                                    autoComplete="off"
                                    className="mb-3 w-full rounded-[0.9rem] border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-950 outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                                />
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            aria-label={`Select ${color} label color`}
                                            className={cn(
                                                "h-6 w-6 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                selectedColor === color ? "border-slate-950" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCreateLabel()}
                                    disabled={!newLabelName.trim() || isCreating}
                                    className="inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create and add"
                                    )}
                                </button>
                            </div>
                        ) : null}

                        <div className="px-3 pt-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-slate-500">Task labels</p>
                                {canManageLabels ? <p className="text-[11px] text-slate-400">Delete unused labels from the list.</p> : null}
                            </div>
                        </div>

                        {errorMessage ? (
                            <div className="mx-3 mt-2 rounded-[0.9rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {errorMessage}
                            </div>
                        ) : null}

                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Loading labels...
                            </div>
                        ) : allLabels.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-slate-500">
                                No labels available.
                            </div>
                        ) : (
                            <div className="max-h-72 space-y-1 overflow-y-auto p-3">
                                {allLabels.map((label) => {
                                    const selected = isLabelSelected(label.id);
                                    return (
                                        <div
                                            key={label.id}
                                            className={cn(
                                                "group flex items-center gap-1 rounded-[0.95rem] transition-colors",
                                                selected ? "bg-primary/10" : "hover:bg-slate-50"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selected) {
                                                        void handleRemoveLabel(label.id);
                                                    } else {
                                                        void handleAddLabel(label.id);
                                                    }
                                                }}
                                                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[0.95rem] px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    <span className="truncate text-sm text-slate-900">{label.name}</span>
                                                </div>
                                                {selected ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                                            </button>
                                            {canManageLabels ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteWorkspaceLabel(label)}
                                                    disabled={deletingLabelId === label.id}
                                                    aria-label={`Delete ${label.name} workspace label`}
                                                    title="Delete workspace label"
                                                    className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 opacity-100 transition-[background-color,color,opacity] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] disabled:cursor-not-allowed disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
                                                >
                                                    {deletingLabelId === label.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                    )}
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
