"use client";

import { Checklist as ChecklistType } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Plus, CheckSquare, Trash2 } from "lucide-react";
import { ChecklistItem } from "./checklist-item";
import { createChecklistItem, deleteChecklist, deleteChecklistItem, updateChecklistItem } from "@/lib/api";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "@/components/ui/toast";

interface ChecklistProps {
    checklist: ChecklistType;
    onUpdate: (updated: ChecklistType) => void;
    onDelete: (id: string) => void;
}

export function Checklist({ checklist, onUpdate, onDelete }: ChecklistProps) {
    const [newItemContent, setNewItemContent] = useState("");
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeletingChecklist, setIsDeletingChecklist] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const completedCount = checklist.items?.filter(i => i.is_done).length || 0;
    const totalCount = checklist.items?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    useEffect(() => {
        if (!isActionsOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (actionsRef.current?.contains(event.target as Node)) return;
            setIsActionsOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsActionsOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isActionsOpen]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim() || isSavingItem) return;

        setIsSavingItem(true);
        try {
            const newItem = await createChecklistItem(checklist.id, newItemContent);
            onUpdate({
                ...checklist,
                items: [...(checklist.items || []), newItem]
            });
            setNewItemContent("");
            setIsAddingItem(false);
        } catch (error) {
            console.error("Failed to add item:", error);
            toast.error("Couldn't add the item. Please try again.");
        } finally {
            setIsSavingItem(false);
        }
    };

    const handleToggleItem = async (itemId: string, isDone: boolean) => {
        const previousItems = checklist.items || [];
        // Optimistic update, roll back if the request fails.
        onUpdate({ ...checklist, items: previousItems.map(item => item.id === itemId ? { ...item, is_done: isDone } : item) });
        try {
            await updateChecklistItem(itemId, { is_done: isDone });
        } catch (error) {
            console.error("Failed to toggle item:", error);
            onUpdate({ ...checklist, items: previousItems });
            toast.error("Couldn't update the item. Please try again.");
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        const previousItems = checklist.items || [];
        onUpdate({ ...checklist, items: previousItems.filter(item => item.id !== itemId) });
        try {
            await deleteChecklistItem(itemId);
        } catch (error) {
            console.error("Failed to delete item:", error);
            onUpdate({ ...checklist, items: previousItems });
            toast.error("Couldn't delete the item. Please try again.");
        }
    };

    const handleUpdateItemContent = async (itemId: string, content: string) => {
        const previousItems = checklist.items || [];
        onUpdate({ ...checklist, items: previousItems.map(item => item.id === itemId ? { ...item, content } : item) });
        try {
            await updateChecklistItem(itemId, { content });
        } catch (error) {
            console.error("Failed to update item content:", error);
            onUpdate({ ...checklist, items: previousItems });
            toast.error("Couldn't save the item. Please try again.");
        }
    };

    const handleDeleteChecklist = async () => {
        setIsDeletingChecklist(true);
        try {
            await deleteChecklist(checklist.id);
            onDelete(checklist.id);
        } catch (error) {
            console.error("Failed to delete checklist:", error);
            toast.error("Couldn't delete the checklist. Please try again.");
            setIsDeletingChecklist(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = checklist.items?.findIndex((i) => i.id === active.id) ?? -1;
            const newIndex = checklist.items?.findIndex((i) => i.id === over?.id) ?? -1;

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(checklist.items || [], oldIndex, newIndex);
                onUpdate({ ...checklist, items: newItems });

                // Call API to reorder if needed, or update individual item position
                // For simplicity/hackathon, we might skip precise backend reorder for now 
                // or implement updateChecklistItem({ position: ... }) logic
                // Given the context, let's assume UI reorder is good enough for MVP
                // or implement basic position update:
                // Calculate new position based on neighbors logic (similar to Tasks)
                // Leaving backend integration of reorder for later optimization
                // but strictly keeping arrayMove for UI consistency
            }
        }
    };

    return (
        <div className="space-y-3">
            <div className="group flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="min-w-0 truncate font-medium text-foreground">{checklist.title}</h3>
                </div>
                <div ref={actionsRef} className="relative opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                    <button
                        type="button"
                        onClick={() => setIsActionsOpen((current) => !current)}
                        aria-label={`Open actions for ${checklist.title}`}
                        aria-expanded={isActionsOpen}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {isActionsOpen ? (
                        <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[var(--modal-surface)] p-1 shadow-[var(--modal-shadow)]">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsActionsOpen(false);
                                    setShowDeleteDialog(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium text-[var(--danger-fg)] transition-colors hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-fg)]/20"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Delete checklist
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span>{Math.round(progress)}%</span>
            </div>

            {/* Items */}
            <div className="space-y-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={checklist.items?.map(i => i.id) || []}
                        strategy={verticalListSortingStrategy}
                    >
                        {checklist.items?.map(item => (
                            <ChecklistItem
                                key={item.id}
                                item={item}
                                onToggle={handleToggleItem}
                                onDelete={handleDeleteItem}
                                onUpdate={handleUpdateItemContent}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Add Item Form */}
            {isAddingItem ? (
                <form onSubmit={handleAddItem} className="flex gap-2 pl-2">
                    <input
                        type="text"
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                            placeholder="Add checklist item..."
                        autoFocus
                        className="flex-1 text-sm bg-transparent border border-primary/20 rounded px-2 py-1 outline-none focus:border-primary"
                    />
                    <div className="flex gap-1">
                        <button
                            type="submit"
                            disabled={!newItemContent.trim() || isSavingItem}
                            className="min-h-11 text-xs bg-primary text-primary-foreground px-3 rounded disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:px-2"
                        >
                            {isSavingItem ? "Adding…" : "Add"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddingItem(false)}
                            className="min-h-11 text-xs hover:bg-muted px-3 rounded md:min-h-0 md:px-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAddingItem(true)}
                    className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary pl-2 py-1 transition-colors md:min-h-0"
                >
                    <Plus className="w-4 h-4" /> Add checklist item
                </button>
            )}

            <ConfirmationDialog
                isOpen={showDeleteDialog}
                title="Delete Checklist"
                description="Are you sure you want to delete this checklist? All items will be removed."
                confirmText="Delete"
                variant="danger"
                isLoading={isDeletingChecklist}
                onConfirm={handleDeleteChecklist}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </div>
    );
}
