"use client";

import type {
    Dispatch,
    FormEventHandler,
    RefObject,
    SetStateAction,
} from "react";
import { Check, CheckSquare, Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { Checklist as ChecklistType } from "@/lib/types";
import { Checklist } from "./checklist";
import { EmptyState, SectionCard } from "./task-detail-modal-parts";

interface TaskDescriptionSectionProps {
    anchorRef: RefObject<HTMLSpanElement | null>;
    description: string;
    descriptionHtml: string;
    descSaveError: string | null;
    descSaved: boolean;
    isEditingDesc: boolean;
    isSavingDesc: boolean;
    isUploadingDescImage: boolean;
    maxImageSizeMb?: number;
    taskDescription: string;
    onCancelEdit: () => void;
    onDescriptionChange: Dispatch<SetStateAction<string>>;
    onImageUpload: (file: File) => Promise<string>;
    onSave: () => void;
    onStartEdit: () => void;
    onUploadingChange: Dispatch<SetStateAction<boolean>>;
}

export function TaskDescriptionSection({
    anchorRef,
    description,
    descriptionHtml,
    descSaveError,
    descSaved,
    isEditingDesc,
    isSavingDesc,
    isUploadingDescImage,
    maxImageSizeMb,
    taskDescription,
    onCancelEdit,
    onDescriptionChange,
    onImageUpload,
    onSave,
    onStartEdit,
    onUploadingChange,
}: TaskDescriptionSectionProps) {
    return (
        <SectionCard
            title="Description"
            className="scroll-mt-28"
            contentClassName="space-y-3"
            action={
                descSaved && !isEditingDesc ? (
                    <span
                        role="status"
                        className="description-saved-indicator inline-flex items-center gap-1 text-xs font-medium text-emerald-600"
                    >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Saved
                    </span>
                ) : undefined
            }
        >
            <span ref={anchorRef} className="block h-0" aria-hidden="true" />
            {isEditingDesc ? (
                <div className="space-y-3">
                    <RichTextEditor
                        content={description}
                        onChange={onDescriptionChange}
                        placeholder="Add a detailed description…"
                        className="min-h-[180px]"
                        enableImageUpload
                        onImageUpload={onImageUpload}
                        maxImageSizeMb={maxImageSizeMb}
                        onUploadingChange={onUploadingChange}
                    />
                    {descSaveError ? (
                        <p role="alert" className="text-sm text-[var(--danger-fg)]">
                            {descSaveError}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={isSavingDesc}
                            className="touch-manipulation rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={isUploadingDescImage || isSavingDesc}
                            className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSavingDesc ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Saving…
                                </span>
                            ) : isUploadingDescImage ? (
                                "Mengunggah gambar…"
                            ) : (
                                "Save Description"
                            )}
                        </button>
                    </div>
                </div>
            ) : taskDescription ? (
                <div
                    onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a")) return;
                        onStartEdit();
                    }}
                    className="rich-text prose prose-sm w-full max-w-none break-words rounded-[var(--radius-lg)] bg-muted/30 p-4 text-slate-700 transition-[background-color] hover:bg-muted/45"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
            ) : (
                <button
                    type="button"
                    onClick={onStartEdit}
                    className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-muted/30 p-4 text-left transition-[background-color] hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">Add a description</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                            Capture context, links, or acceptance notes.
                        </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">Click to edit</span>
                </button>
            )}
        </SectionCard>
    );
}

interface TaskChecklistsSectionProps {
    anchorRef: RefObject<HTMLSpanElement | null>;
    checklists: ChecklistType[];
    completedChecklistItems: number;
    isCreatingChecklist: boolean;
    isSavingChecklist: boolean;
    newChecklistTitle: string;
    totalChecklistItems: number;
    onCancelCreate: () => void;
    onCreateChecklist: FormEventHandler<HTMLFormElement>;
    onDeleteChecklist: (id: string) => void;
    onNewChecklistTitleChange: (value: string) => void;
    onStartCreate: () => void;
    onUpdateChecklist: (checklist: ChecklistType) => void;
}

export function TaskChecklistsSection({
    anchorRef,
    checklists,
    completedChecklistItems,
    isCreatingChecklist,
    isSavingChecklist,
    newChecklistTitle,
    totalChecklistItems,
    onCancelCreate,
    onCreateChecklist,
    onDeleteChecklist,
    onNewChecklistTitleChange,
    onStartCreate,
    onUpdateChecklist,
}: TaskChecklistsSectionProps) {
    const progress = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0;

    return (
        <SectionCard
            title="Checklists"
            icon={CheckSquare}
            className="scroll-mt-28"
            action={
                !isCreatingChecklist ? (
                    <button
                        type="button"
                        onClick={onStartCreate}
                        className="touch-manipulation rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                        New checklist
                    </button>
                ) : null
            }
        >
            <span ref={anchorRef} className="block h-0" aria-hidden="true" />
            <div className="space-y-5">
                {checklists.length > 0 ? (
                    checklists.map((checklist) => (
                        <div key={checklist.id} className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
                            <Checklist
                                checklist={checklist}
                                onUpdate={onUpdateChecklist}
                                onDelete={onDeleteChecklist}
                            />
                        </div>
                    ))
                ) : (
                    <EmptyState title="No checklist yet. Break the work into steps so progress is easy to track." />
                )}

                {isCreatingChecklist && (
                    <form onSubmit={onCreateChecklist} className="rounded-[1.2rem] border border-slate-300 bg-white p-4">
                        <label htmlFor="checklist-title" className="mb-2 block text-xs font-medium text-slate-500">
                            Checklist title
                        </label>
                        <input
                            id="checklist-title"
                            name="checklist_title"
                            type="text"
                            value={newChecklistTitle}
                            onChange={(event) => onNewChecklistTitleChange(event.target.value)}
                            placeholder="Planning pass…"
                            autoFocus
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancelCreate}
                                className="touch-manipulation rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newChecklistTitle.trim() || isSavingChecklist}
                                className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            >
                                {isSavingChecklist ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                        Creating…
                                    </span>
                                ) : (
                                    "Create"
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {totalChecklistItems > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="font-medium">Progress</span>
                            <span className="tabular-nums">{completedChecklistItems}/{totalChecklistItems}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-[width]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
