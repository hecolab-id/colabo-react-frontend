"use client";

import { useState, useEffect } from "react";
import { Check, Plus } from "lucide-react";
import { createLabel, getTeamLabels, addLabelToTask, removeLabelFromTask } from "@/lib/api";
import { LabelBadge } from "@/components/ui/label-badge";
import { cn } from "@/lib/utils";
import { Label } from "@/lib/types";

interface LabelSelectorProps {
    taskId: string;
    teamSlug: string;
    currentLabels: Label[];
    onUpdate: () => void;
}

export function LabelSelector({ taskId, teamSlug, currentLabels, onUpdate }: LabelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newLabelName, setNewLabelName] = useState("");
    const [selectedColor, setSelectedColor] = useState("#6366F1");
    const [isCreating, setIsCreating] = useState(false);

    const colorOptions = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#64748B"];

    useEffect(() => {
        if (isOpen) {
            loadLabels();
        }
    }, [isOpen, teamSlug]);

    const loadLabels = async () => {
        setIsLoading(true);
        try {
            const labels = await getTeamLabels(teamSlug);
            setAllLabels(Array.isArray(labels) ? labels : []);
        } catch (error) {
            console.error("Failed to load labels:", error);
            setAllLabels([]);
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
        }
    };

    const handleRemoveLabel = async (labelId: string) => {
        try {
            await removeLabelFromTask(taskId, labelId);
            onUpdate();
        } catch (error) {
            console.error("Failed to remove label:", error);
        }
    };

    const handleCreateLabel = async () => {
        const trimmedName = newLabelName.trim();
        if (!trimmedName) return;

        setIsCreating(true);
        try {
            const createdLabel = await createLabel(teamSlug, trimmedName, selectedColor);
            await addLabelToTask(taskId, createdLabel.id);
            setAllLabels((current) => [...current, createdLabel].sort((left, right) => left.name.localeCompare(right.name)));
            setNewLabelName("");
            onUpdate();
        } catch (error) {
            console.error("Failed to create label:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const isLabelSelected = (labelId: string) => {
        return currentLabels.some((l) => l.id === labelId);
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 items-center">
                {currentLabels.map((label) => (
                    <LabelBadge
                        key={label.id}
                        label={label}
                        onRemove={() => handleRemoveLabel(label.id)}
                    />
                ))}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-muted transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Label
                </button>
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-2 left-0 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-2">
                        <div className="border-b border-border pb-3 mb-2">
                            <label htmlFor="new-task-label" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Create Custom Label
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
                                        handleCreateLabel();
                                    }
                                }}
                                placeholder="Label name…"
                                autoComplete="off"
                                className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                            />
                            <div className="mb-2 flex flex-wrap gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        aria-label={`Select ${color} label color`}
                                        className={cn(
                                            "h-6 w-6 rounded-full border-2 transition-transform hover:scale-105",
                                            selectedColor === color ? "border-foreground" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateLabel}
                                disabled={!newLabelName.trim() || isCreating}
                                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCreating ? "Creating…" : "Create & add label"}
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : allLabels.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                No labels available
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {allLabels.map((label) => {
                                    const selected = isLabelSelected(label.id);
                                    return (
                                        <button
                                            key={label.id}
                                            onClick={() => {
                                                if (selected) {
                                                    handleRemoveLabel(label.id);
                                                } else {
                                                    handleAddLabel(label.id);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors",
                                                selected && "bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded"
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                <span className="text-sm">{label.name}</span>
                                            </div>
                                            {selected && <Check className="w-4 h-4 text-primary" />}
                                        </button>
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
