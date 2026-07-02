"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import {
    Check,
    ChevronDown,
    Flag,
    Loader2,
    MoreHorizontal,
    Trash2,
    User,
    X,
} from "lucide-react";
import { ActivityLog, Checklist as ChecklistType, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    createChecklist,
    deleteTask,
    getProjectColumns,
    getChecklists,
    getComments,
    getTask,
    getTaskActivities,
    updateTask,
} from "@/lib/api";
import { useStore } from "@/lib/store";
import { useUsage } from "@/lib/hooks/use-billing";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DialogShell } from "@/components/ui/dialog-shell";
import { toast } from "@/components/ui/toast";
import { LabelSelector } from "@/components/modals/label-selector";
import { AiTitleRefineBanner, AiTitleRefineButton, useAiTitleRefine } from "@/components/ai/ai-title-refine";
import {
    formatTaskDate,
    getDueDateTone,
    priorityToneMap,
    statusToneMap,
} from "@/lib/task-ui";
import type { Column } from "@/lib/types";
import {
    enhanceRichTextLinks,
    FieldLabel,
    SectionCard,
} from "./task-detail-modal-parts";
import { AttachmentSection } from "./task-detail-attachments";
import { TaskChecklistsSection, TaskDescriptionSection } from "./task-detail-content-sections";
import { TaskCommentsActivitySection, TaskCommentComposer } from "./task-detail-comments-section";
import { TaskDetailPreviewOverlays } from "./task-detail-preview-overlays";
import { useTaskDetailAttachments } from "./use-task-detail-attachments";
import { useTaskDetailComments } from "./use-task-detail-comments";

interface TaskDetailModalProps {
    task: Task;
    projectColumns?: Column[];
    onClose: () => void;
    onDelete?: (taskId: string) => void | Promise<unknown>;
    onUpdate?: (task: Task) => void;
}

export function TaskDetailModal({ task, projectColumns: initialProjectColumns, onClose, onDelete, onUpdate }: TaskDetailModalProps) {
    const { currentTeam, user: currentUser } = useStore();
    const { data: teamUsage } = useUsage(currentTeam?.id || "");
    const maxImageSizeMb = teamUsage?.plan?.max_file_size_mb;
    const bodyRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const assigneeRef = useRef<HTMLDivElement>(null);
    const priorityRef = useRef<HTMLDivElement>(null);
    const headerMenuRef = useRef<HTMLDivElement>(null);
    const sectionRefs = {
        description: useRef<HTMLSpanElement>(null),
        checklist: useRef<HTMLSpanElement>(null),
        comments: useRef<HTMLSpanElement>(null),
        attachments: useRef<HTMLSpanElement>(null),
        settings: useRef<HTMLSpanElement>(null),
    };

    const [taskState, setTaskState] = useState(task);
    const [checklists, setChecklists] = useState<ChecklistType[]>(task.checklists || []);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [projectColumns, setProjectColumns] = useState<Column[]>(initialProjectColumns || []);
    const [isProjectColumnsLoading, setIsProjectColumnsLoading] = useState(!initialProjectColumns);
    const [hasLoadedProjectColumns, setHasLoadedProjectColumns] = useState(Boolean(initialProjectColumns));
    const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [labels, setLabels] = useState<typeof task.labels>(task.labels || []);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(task.title);
    const titleRefiner = useAiTitleRefine({
        value: title,
        onChange: setTitle,
        teamId: taskState.project?.team_id,
    });
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [description, setDescription] = useState(task.description || "");
    const [isUploadingDescImage, setIsUploadingDescImage] = useState(false);
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [descSaveError, setDescSaveError] = useState<string | null>(null);
    const [descSaved, setDescSaved] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [changingPriority, setChangingPriority] = useState<string | null>(null);
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const [isSavingStartDate, setIsSavingStartDate] = useState(false);
    const [isSavingDueDate, setIsSavingDueDate] = useState(false);
    const [isSavingChecklist, setIsSavingChecklist] = useState(false);
    const [activeMobileSection, setActiveMobileSection] = useState<"description" | "checklist" | "comments" | "attachments" | "settings">("description");
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingDone, setIsMarkingDone] = useState(false);
    const [doneActionError, setDoneActionError] = useState<string | null>(null);

    const taskComments = useTaskDetailComments({
        task,
        taskState,
        currentTeam,
        currentUser,
        commentInputRef,
        setTaskState,
        onUpdate,
    });
    const taskAttachments = useTaskDetailAttachments({
        task,
        fileInputRef,
        setTaskState,
        onUpdate,
    });

    const {
        activeMentionIndex,
        comment,
        comments,
        filteredMentionMembers,
        handleCommentChange,
        handleCommentKeyDown,
        handleCommentKeyUp,
        handleSend,
        isSubmittingComment,
        mentionQuery,
        mentionRange,
        resetComments,
        selectMention,
        setComments,
        updateMentionState,
    } = taskComments;
    const {
        activePdfPreview,
        applyFetchedTaskAttachments,
        attachmentAnnouncement,
        attachments,
        attachmentsRef,
        cancelReplace,
        confirmReplace,
        handleDescriptionImageUpload,
        handleFileUpload,
        handleRemoveAttachment,
        imageAttachments,
        imagePreviewIndex,
        isUploading,
        openImagePreview,
        pendingReplace,
        recentlyAdded,
        recentlyReplaced,
        removingAttachmentUrl,
        resetAttachments,
        setActivePdfPreview,
        setImagePreviewIndex,
        setShowAllAttachments,
        showAllAttachments,
        syncAttachmentsFromTask,
    } = taskAttachments;

    useEffect(() => {
        if (!descSaved) return;
        const timeout = setTimeout(() => setDescSaved(false), 2000);
        return () => clearTimeout(timeout);
    }, [descSaved]);

    useEffect(() => {
        setTaskState(task);
        setTitle(task.title);
        setDescription(task.description || "");
        resetComments(task);
        setChecklists(task.checklists || []);
        setLabels(task.labels || []);
        resetAttachments(task);
        setIsEditingTitle(false);
        setIsEditingDesc(false);
        setIsSavingDesc(false);
        setDescSaveError(null);
        setDescSaved(false);
        setIsAssigning(false);
        setIsPriorityOpen(false);
        setAssigningUserId(null);
        setChangingPriority(null);
        setIsSavingTitle(false);
        setIsSavingStartDate(false);
        setIsSavingDueDate(false);
        setIsSavingChecklist(false);
        setIsHeaderMenuOpen(false);
        setDoneActionError(null);
        if (initialProjectColumns) {
            setProjectColumns(initialProjectColumns);
            setIsProjectColumnsLoading(false);
            setHasLoadedProjectColumns(true);
        } else {
            setProjectColumns([]);
            setIsProjectColumnsLoading(true);
            setHasLoadedProjectColumns(false);
        }
    }, [initialProjectColumns, resetAttachments, resetComments, task]);

    const loadTaskDetails = useCallback(async () => {
        setIsLoadingDetails(true);
        setDetailsError(null);
        setIsProjectColumnsLoading(!initialProjectColumns);

        try {
            const [logs, fetchedComments, fetchedChecklists, fetchedTask, fetchedColumns] = await Promise.all([
                getTaskActivities(task.id),
                getComments(task.id),
                getChecklists(task.id),
                getTask(task.id),
                initialProjectColumns ? Promise.resolve(initialProjectColumns) : getProjectColumns(task.project_id),
            ]);

            setActivities(logs || []);
            if (fetchedComments) setComments(fetchedComments);
            if (fetchedChecklists) setChecklists(fetchedChecklists);
            setProjectColumns(fetchedColumns || []);
            setHasLoadedProjectColumns(true);
            if (fetchedTask) {
                setTaskState(fetchedTask);
                setLabels(fetchedTask.labels || []);
                applyFetchedTaskAttachments(fetchedTask);
            }
        } catch (error) {
            console.error("Failed to load task details", error);
            setDetailsError("Some task details could not be loaded.");
        } finally {
            setIsLoadingDetails(false);
            setIsProjectColumnsLoading(false);
        }
    }, [applyFetchedTaskAttachments, initialProjectColumns, setComments, task.id, task.project_id]);

    useEffect(() => {
        void loadTaskDetails();
    }, [loadTaskDetails]);

    useEscapeKey(isAssigning || isPriorityOpen || isHeaderMenuOpen, () => {
        setIsAssigning(false);
        setIsPriorityOpen(false);
        setIsHeaderMenuOpen(false);
    });

    useEffect(() => {
        if (!isAssigning && !isPriorityOpen && !isHeaderMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (isAssigning && assigneeRef.current && !assigneeRef.current.contains(target)) {
                setIsAssigning(false);
            }
            if (isPriorityOpen && priorityRef.current && !priorityRef.current.contains(target)) {
                setIsPriorityOpen(false);
            }
            if (isHeaderMenuOpen && headerMenuRef.current && !headerMenuRef.current.contains(target)) {
                setIsHeaderMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isAssigning, isPriorityOpen, isHeaderMenuOpen]);

    useEffect(() => {
        const container = bodyRef.current;
        if (!container) return;

        const handleScroll = () => {
            const sections: Array<["description" | "checklist" | "comments" | "attachments" | "settings", HTMLSpanElement | null]> = [
                ["description", sectionRefs.description.current],
                ["checklist", sectionRefs.checklist.current],
                ["comments", sectionRefs.comments.current],
                ["attachments", sectionRefs.attachments.current],
                ["settings", sectionRefs.settings.current],
            ];

            const threshold = container.scrollTop + 120;
            let current: "description" | "checklist" | "comments" | "attachments" | "settings" = "description";

            sections.forEach(([id, element]) => {
                if (element && element.offsetTop <= threshold) {
                    current = id;
                }
            });

            setActiveMobileSection(current);
        };

        handleScroll();
        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [sectionRefs.attachments, sectionRefs.checklist, sectionRefs.comments, sectionRefs.description, sectionRefs.settings]);

    const handleUpdateTask = async (updates: Partial<Task>, options?: { silent?: boolean }) => {
        try {
            const updated = await updateTask(task.id, updates);
            // A metadata-only update (priority, title, dates, etc.) must not let
            // its response overwrite the attachments list: a concurrent
            // description-image add may not be reflected in it yet. Keep our local
            // list (attachmentsRef) as the source of truth for attachments unless
            // this very update changed them.
            const merged: Task =
                "attachments" in updates ? updated : { ...updated, attachments: attachmentsRef.current };
            setTaskState(merged);
            setTitle(merged.title);
            setDescription(merged.description || "");
            syncAttachmentsFromTask(merged);
            setLabels(merged.labels || []);
            onUpdate?.(merged);
            return merged;
        } catch (error) {
            console.error("Failed to update task:", error);
            // Centralized error feedback for every task-update action (assign,
            // priority, title, due date, etc.). Callers can opt out via `silent`
            // when they show their own inline error.
            if (!options?.silent) toast.error("Couldn't save your change. Please try again.");
            return null;
        }
    };

    const refreshActivities = async () => {
        const logs = await getTaskActivities(task.id);
        setActivities(logs || []);
    };

    const handleTitleSave = async () => {
        const nextTitle = title.trim();
        if (!nextTitle) {
            setTitle(taskState.title);
            setIsEditingTitle(false);
            return;
        }

        if (nextTitle !== taskState.title) {
            setIsSavingTitle(true);
            const updated = await handleUpdateTask({ title: nextTitle });
            setIsSavingTitle(false);
            if (!updated) return; // keep editing so the user can retry; toast already shown
            await refreshActivities();
        }

        setIsEditingTitle(false);
    };

    const handleDescSave = async () => {
        if (description === (taskState.description || "")) {
            setIsEditingDesc(false);
            return;
        }

        setIsSavingDesc(true);
        setDescSaveError(null);
        const updated = await handleUpdateTask({ description }, { silent: true });

        if (!updated) {
            setIsSavingDesc(false);
            setDescSaveError("Couldn't save. Please try again.");
            return;
        }

        setIsSavingDesc(false);
        setIsEditingDesc(false);
        setDescSaved(true);
        // Activity feed is non-blocking; don't make the editor wait on it.
        void refreshActivities();
    };

    const handleAssign = async (userId: string | null) => {
        if (assigningUserId) return;
        setAssigningUserId(userId ?? "__unassign__");
        const updated = await handleUpdateTask({ assignee_id: userId });
        setAssigningUserId(null);
        if (updated) {
            setIsAssigning(false);
            await refreshActivities();
        }
    };

    const handlePriorityChange = async (priority: string) => {
        if (changingPriority) return;
        setChangingPriority(priority);
        const updated = await handleUpdateTask({ priority: priority as Task["priority"] });
        setChangingPriority(null);
        if (updated) {
            setIsPriorityOpen(false);
            await refreshActivities();
        }
    };

    const handleMarkAsDone = async () => {
        let resolvedDoneColumn = projectColumns.find((column) => column.type === "done");

        if (!resolvedDoneColumn) {
            try {
                setIsProjectColumnsLoading(true);
                const fetchedColumns = await getProjectColumns(taskState.project_id);
                setProjectColumns(fetchedColumns || []);
                setHasLoadedProjectColumns(true);
                resolvedDoneColumn = fetchedColumns.find((column) => column.type === "done");
            } catch (error) {
                console.error("Failed to load project columns for done action:", error);
            } finally {
                setIsProjectColumnsLoading(false);
            }
        }

        if (!resolvedDoneColumn) {
            setDoneActionError("Done column belum tersedia di project ini.");
            return;
        }

        setIsMarkingDone(true);
        setDoneActionError(null);

        try {
            const updated = await handleUpdateTask({
                status: "DONE",
                column_id: resolvedDoneColumn.id,
            });

            if (updated) {
                const nextTask = {
                    ...updated,
                    column: resolvedDoneColumn,
                    column_id: resolvedDoneColumn.id,
                    status: "DONE",
                } satisfies Task;

                setTaskState(nextTask);
                onUpdate?.(nextTask);
                await refreshActivities();
            } else {
                setDoneActionError("Task belum berhasil dipindahkan ke kolom done.");
            }
        } catch (error) {
            console.error("Failed to mark task as done:", error);
            setDoneActionError("Task belum berhasil dipindahkan ke kolom done.");
        } finally {
            setIsMarkingDone(false);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (onDelete) {
                await onDelete(task.id);
            } else {
                await deleteTask(task.id);
            }
            onClose();
        } catch (error) {
            console.error("Failed to delete task:", error);
            setIsDeleting(false);
        }
    };

    const handleCreateChecklist = async (event: FormEvent) => {
        event.preventDefault();
        if (!newChecklistTitle.trim() || isSavingChecklist) return;

        setIsSavingChecklist(true);
        try {
            const newChecklist = await createChecklist(task.id, newChecklistTitle);
            const updatedChecklists = [...checklists, newChecklist];
            setChecklists(updatedChecklists);
            setNewChecklistTitle("");
            setIsCreatingChecklist(false);

            const updatedTask = { ...taskState, checklists: updatedChecklists };
            setTaskState(updatedTask);
            onUpdate?.(updatedTask);
        } catch (error) {
            console.error("Failed to create checklist:", error);
            toast.error("Couldn't add the checklist. Please try again.");
        } finally {
            setIsSavingChecklist(false);
        }
    };

    const handleUpdateChecklist = (updatedChecklist: ChecklistType) => {
        const updatedChecklists = checklists.map((item) => (item.id === updatedChecklist.id ? updatedChecklist : item));
        setChecklists(updatedChecklists);

        const updatedTask = { ...taskState, checklists: updatedChecklists };
        setTaskState(updatedTask);
        onUpdate?.(updatedTask);
    };

    const handleDeleteChecklist = (id: string) => {
        const updatedChecklists = checklists.filter((item) => item.id !== id);
        setChecklists(updatedChecklists);

        const updatedTask = { ...taskState, checklists: updatedChecklists };
        setTaskState(updatedTask);
        onUpdate?.(updatedTask);
    };

    const priority = priorityToneMap[taskState.priority] || priorityToneMap.MEDIUM;
    const status = statusToneMap[taskState.status] || statusToneMap.TODO;
    const statusLabel = taskState.status === "DONE" ? "Completed" : status.label;
    const dueDateTone = getDueDateTone(taskState.due_date || undefined);
    const descriptionHtml = useMemo(
        () => enhanceRichTextLinks(taskState.description || ""),
        [taskState.description],
    );
    const completedChecklistItems = checklists.reduce(
        (total, checklist) => total + (checklist.items?.filter((item) => item.is_done).length || 0),
        0
    );
    const totalChecklistItems = checklists.reduce((total, checklist) => total + (checklist.items?.length || 0), 0);
    const doneColumn = projectColumns.find((column) => column.type === "done");
    const currentTaskColumn = taskState.column
        || projectColumns.find((column) => column.id === taskState.column_id)
        || null;
    const isTaskDone = taskState.status === "DONE" || currentTaskColumn?.type === "done";
    const canShowMissingDoneColumnMessage = hasLoadedProjectColumns && !isProjectColumnsLoading && !doneColumn && !isTaskDone;
    const canManageLabels = Boolean(
        currentTeam && currentUser && (
            currentTeam.owner_id === currentUser.id ||
            ["OWNER", "ADMIN"].includes((currentTeam.role || "").toUpperCase())
        )
    );
    const scrollToSection = (section: "description" | "checklist" | "comments" | "attachments" | "settings") => {
        const container = bodyRef.current;
        const target = sectionRefs[section].current;
        if (!container || !target) return;

        container.scrollTo({
            top: Math.max(0, target.offsetTop - 72),
            behavior: "smooth",
        });
        setActiveMobileSection(section);
    };

    if (typeof document === "undefined") {
        return null;
    }

    const modal = (
        <DialogShell
            onClose={onClose}
            labelledBy={isEditingTitle ? "task-title" : "task-detail-title"}
            maxWidthClassName="max-w-7xl"
            zIndexClassName="z-50"
            panelClassName="h-[100dvh] overflow-hidden rounded-none border-0 bg-[var(--modal-surface)] shadow-none sm:h-auto sm:max-h-[94vh] sm:rounded-[var(--modal-radius)] sm:border sm:shadow-[var(--modal-shadow)]"
            className="sm:p-6"
            mobileSheet={false}
            escapeEnabled={!showDeleteDialog}
        >
                <div className="flex h-[100dvh] flex-col overflow-hidden sm:h-auto sm:max-h-[94vh]">
                    <header className="sticky top-0 z-20 border-b border-border/80 bg-[var(--modal-surface)]/95 px-4 py-3 backdrop-blur-2xl md:px-6 md:py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-2 md:space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {currentTaskColumn ? (
                                            <span className="rounded-full border border-border bg-muted/45 px-3 py-1 text-xs font-medium tracking-normal text-muted-foreground">
                                                In {currentTaskColumn.name}
                                            </span>
                                        ) : null}
                                        {taskState.due_date && (
                                            <span className={cn("rounded-full px-3 py-1 text-xs font-medium tracking-normal", dueDateTone.className)}>
                                                {dueDateTone.label || `Due ${formatTaskDate(taskState.due_date)}`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={isTaskDone ? "secondary" : "default"}
                                            onClick={handleMarkAsDone}
                                            disabled={isMarkingDone || isProjectColumnsLoading || isTaskDone || !doneColumn}
                                            className={cn(
                                                "h-8 px-3 text-xs",
                                                isTaskDone && "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]",
                                            )}
                                        >
                                            {isMarkingDone ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                    Moving to Done...
                                                </>
                                            ) : isProjectColumnsLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                    Checking...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                    {isTaskDone ? "Completed" : "Mark as Done"}
                                                </>
                                            )}
                                        </Button>
                                        {canShowMissingDoneColumnMessage ? (
                                            <span className="text-xs text-slate-500">
                                                Tambahkan kolom bertipe done untuk memakai aksi ini.
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {doneActionError ? (
                                    <p className="text-sm text-[var(--danger-fg)]">{doneActionError}</p>
                                ) : null}

                                {isEditingTitle ? (
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <label htmlFor="task-title" className="sr-only">Task title</label>
                                            <div className="relative min-w-0 flex-1">
                                                <input
                                                    id="task-title"
                                                    name="task_title"
                                                    type="text"
                                                    value={title}
                                                    onChange={(event) => setTitle(event.target.value)}
                                                    onBlur={handleTitleSave}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") handleTitleSave();
                                                    }}
                                                    autoFocus
                                                    className="block h-12 w-full rounded-[var(--radius-lg)] border border-[var(--control-border)] bg-[var(--control-bg)] pl-4 pr-12 text-xl font-semibold tracking-normal text-foreground outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 md:h-14 md:text-2xl"
                                                />
                                                {/* Wrapper preventDefault on mousedown keeps the input focused
                                                    so onBlur (which auto-saves) does not race the async refine. */}
                                                <div
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                >
                                                    <AiTitleRefineButton state={titleRefiner} />
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                onClick={handleTitleSave}
                                                disabled={isSavingTitle}
                                                aria-label="Save title"
                                            >
                                                {isSavingTitle ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                ) : (
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                )}
                                            </Button>
                                        </div>
                                        <div onMouseDown={(e) => e.preventDefault()}>
                                            <AiTitleRefineBanner state={titleRefiner} />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTitle(true)}
                                        className="group -mx-1 block w-[calc(100%+0.5rem)] rounded-[var(--radius-lg)] px-1 py-1 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                        title="Edit title"
                                    >
                                        <h2 id="task-detail-title" className="min-w-0 flex-1 text-balance text-2xl font-semibold tracking-normal text-foreground md:text-[2rem]">
                                            {taskState.title}
                                        </h2>
                                    </button>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <div ref={headerMenuRef} className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsHeaderMenuOpen((current) => !current)}
                                        aria-label="Open task actions"
                                        aria-expanded={isHeaderMenuOpen}
                                    >
                                        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                                    </Button>

                                    {isHeaderMenuOpen ? (
                                        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[var(--modal-surface)] p-1 shadow-[var(--modal-shadow)]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsHeaderMenuOpen(false);
                                                    setShowDeleteDialog(true);
                                                }}
                                                disabled={isDeleting}
                                                className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium text-[var(--danger-fg)] transition-colors hover:bg-[var(--danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-fg)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                {isDeleting ? "Deleting..." : "Delete task"}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    onClick={onClose}
                                    aria-label="Close task details"
                                >
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    </header>

                    <div className="sticky top-[88px] z-10 border-b border-border/70 bg-[var(--modal-surface)]/95 px-4 py-2 backdrop-blur-2xl md:hidden">
                        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {([
                                ["description", "Description"],
                                ["checklist", "Checklist"],
                                ["comments", "Comments"],
                                ["attachments", "Files"],
                                ["settings", "Settings"],
                            ] as const).map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => scrollToSection(id)}
                                    className={cn(
                                        "shrink-0 touch-manipulation rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition-[border-color,background-color,color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                        activeMobileSection === id
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-[var(--surface-raised)] text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div ref={bodyRef} className="flex-1 overflow-y-auto bg-muted/20">
                        {detailsError ? (
                            <div className="mx-4 mt-4 rounded-[var(--radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)] md:mx-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span>{detailsError}</span>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => void loadTaskDetails()}
                                        className="h-8 px-3 text-xs"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                        <div className="grid gap-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.38fr)] md:gap-5 md:pb-6 md:pr-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                            <div className="space-y-6 bg-white px-4 py-4 md:px-6 md:py-6">
                                <TaskDescriptionSection
                                    anchorRef={sectionRefs.description}
                                    description={description}
                                    descriptionHtml={descriptionHtml}
                                    descSaveError={descSaveError}
                                    descSaved={descSaved}
                                    isEditingDesc={isEditingDesc}
                                    isSavingDesc={isSavingDesc}
                                    isUploadingDescImage={isUploadingDescImage}
                                    maxImageSizeMb={maxImageSizeMb}
                                    taskDescription={taskState.description || ""}
                                    onCancelEdit={() => {
                                        setDescription(taskState.description || "");
                                        setDescSaveError(null);
                                        setIsEditingDesc(false);
                                    }}
                                    onDescriptionChange={setDescription}
                                    onImageUpload={handleDescriptionImageUpload}
                                    onSave={handleDescSave}
                                    onStartEdit={() => setIsEditingDesc(true)}
                                    onUploadingChange={setIsUploadingDescImage}
                                />

                                <TaskChecklistsSection
                                    anchorRef={sectionRefs.checklist}
                                    checklists={checklists}
                                    completedChecklistItems={completedChecklistItems}
                                    isCreatingChecklist={isCreatingChecklist}
                                    isSavingChecklist={isSavingChecklist}
                                    newChecklistTitle={newChecklistTitle}
                                    totalChecklistItems={totalChecklistItems}
                                    onCancelCreate={() => setIsCreatingChecklist(false)}
                                    onCreateChecklist={handleCreateChecklist}
                                    onDeleteChecklist={handleDeleteChecklist}
                                    onNewChecklistTitleChange={setNewChecklistTitle}
                                    onStartCreate={() => setIsCreatingChecklist(true)}
                                    onUpdateChecklist={handleUpdateChecklist}
                                />

                                <p className="sr-only" role="status" aria-live="polite">
                                    {attachmentAnnouncement}
                                </p>
                                <AttachmentSection
                                    attachments={attachments}
                                    anchorRef={sectionRefs.attachments}
                                    fileInputRef={fileInputRef}
                                    lastUpdatedAt={taskState.updated_at}
                                    isUploading={isUploading}
                                    showAllAttachments={showAllAttachments}
                                    recentlyReplaced={recentlyReplaced}
                                    recentlyAdded={recentlyAdded}
                                    removingAttachmentUrl={removingAttachmentUrl}
                                    onFileUpload={handleFileUpload}
                                    onOpenImagePreview={openImagePreview}
                                    onOpenPdfPreview={setActivePdfPreview}
                                    onRemoveAttachment={handleRemoveAttachment}
                                    onToggleShowAllAttachments={() => setShowAllAttachments((current) => !current)}
                                />

                                <TaskCommentsActivitySection
                                    activeMentionIndex={activeMentionIndex}
                                    activities={activities}
                                    anchorRef={sectionRefs.comments}
                                    comment={comment}
                                    commentInputRef={commentInputRef}
                                    comments={comments}
                                    filteredMentionMembers={filteredMentionMembers}
                                    isSubmittingComment={isSubmittingComment}
                                    mentionQuery={mentionQuery}
                                    mentionRange={mentionRange}
                                    onCommentChange={handleCommentChange}
                                    onCommentKeyDown={handleCommentKeyDown}
                                    onCommentKeyUp={handleCommentKeyUp}
                                    onMentionStateUpdate={updateMentionState}
                                    onSelectMention={selectMention}
                                    onSend={handleSend}
                                />
                            </div>

                            <aside className="space-y-6 px-4 pb-4 md:sticky md:top-6 md:self-start md:px-0 md:pb-0 md:pt-6">
                                <SectionCard title="Properties" icon={Flag} className="scroll-mt-28">
                                    <span ref={sectionRefs.settings} className="block h-0" aria-hidden="true" />
                                    <div className="divide-y divide-slate-200/70">
                                        <div>
                                            <FieldLabel>Assignee</FieldLabel>
                                            <div ref={assigneeRef} className={cn("relative", isAssigning && "z-20")}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAssigning((current) => {
                                                            const next = !current;
                                                            if (next) setIsPriorityOpen(false);
                                                            return next;
                                                        });
                                                    }}
                                                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-slate-300 bg-white px-3 py-2 text-left transition-[border-color,background-color] hover:border-primary/25 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    <div className="min-w-0 flex items-center gap-3">
                                                        {taskState.assignee ? (
                                                            <Avatar user={taskState.assignee} size="sm" tone="tint" className="h-8 w-8" />
                                                        ) : (
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">?</span>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-950">
                                                                {taskState.assignee?.name || "Unassigned"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                                </button>

                                                {isAssigning && (
                                                    <div className="mt-2 overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.45)] md:absolute md:left-0 md:right-0 md:top-full">
                                                        <div className="max-h-64 overflow-y-auto p-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAssign(null)}
                                                                disabled={assigningUserId !== null}
                                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-slate-500">
                                                                    <User className="h-4 w-4" aria-hidden="true" />
                                                                </div>
                                                                <span className="text-slate-700">Unassigned</span>
                                                                {assigningUserId === "__unassign__" ? (
                                                                    <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                                                                ) : null}
                                                            </button>
                                                            {currentTeam?.members?.map((member) => (
                                                                <button
                                                                    key={member.id}
                                                                    type="button"
                                                                    onClick={() => handleAssign(member.id)}
                                                                    disabled={assigningUserId !== null}
                                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    <Avatar user={member} size="sm" tone="tint" />
                                                                    <span className="min-w-0 flex-1 truncate text-slate-900">{member.name}</span>
                                                                    {assigningUserId === member.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                                                                    ) : taskState.assignee_id === member.id ? (
                                                                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                                                                    ) : null}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3">
                                            <FieldLabel>Priority</FieldLabel>
                                            <div ref={priorityRef} className={cn("relative", isPriorityOpen && "z-20")}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsPriorityOpen((current) => {
                                                            const next = !current;
                                                            if (next) setIsAssigning(false);
                                                            return next;
                                                        });
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                        priority.badgeClassName
                                                    )}
                                                >
                                                    {priority.label}
                                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                                </button>

                                                {isPriorityOpen && (
                                                    <div className="mt-2 overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white py-1 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.45)] md:absolute md:left-0 md:right-0 md:top-full">
                                                        {Object.entries(priorityToneMap).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => handlePriorityChange(key)}
                                                                disabled={changingPriority !== null}
                                                                className={cn(
                                                                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
                                                                    taskState.priority === key ? "bg-slate-50" : ""
                                                                )}
                                                            >
                                                                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", config.badgeClassName)}>
                                                                    {config.label}
                                                                </span>
                                                                {changingPriority === key ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                                                                ) : taskState.priority === key ? (
                                                                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                                                                ) : null}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3">
                                            <FieldLabel>Labels</FieldLabel>
                                            {currentTeam?.slug ? (
                                                <LabelSelector
                                                    taskId={task.id}
                                                    teamSlug={currentTeam.slug}
                                                    currentLabels={labels || []}
                                                    canManageLabels={canManageLabels}
                                                    onUpdate={async () => {
                                                        try {
                                                            const updatedTask = await getTask(task.id);
                                                            setTaskState(updatedTask);
                                                            setLabels(updatedTask.labels || []);
                                                            onUpdate?.(updatedTask);
                                                            await refreshActivities();
                                                        } catch (error) {
                                                            console.error("Failed to refresh task labels:", error);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="rounded-[1.1rem] border border-border bg-muted/50 px-3 py-4 text-sm text-slate-500">
                                                    Load a team to manage labels for this task.
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3">
                                            <label htmlFor="task-start-date">
                                                <FieldLabel>Start date</FieldLabel>
                                            </label>
                                            <input
                                                id="task-start-date"
                                                name="task_start_date"
                                                type="date"
                                                disabled={isSavingStartDate}
                                                max={taskState.due_date ? new Date(taskState.due_date).toISOString().split("T")[0] : undefined}
                                                value={taskState.start_date ? new Date(taskState.start_date).toISOString().split("T")[0] : ""}
                                                onChange={async (event) => {
                                                    const newDate = event.target.value ? new Date(event.target.value).toISOString() : null;
                                                    setIsSavingStartDate(true);
                                                    const updated = await handleUpdateTask({ start_date: newDate });
                                                    setIsSavingStartDate(false);
                                                    if (updated) {
                                                        await refreshActivities();
                                                    }
                                                }}
                                                className="h-[var(--control-height-md)] w-full rounded-[var(--radius-lg)] border border-[var(--control-border)] bg-[var(--control-bg)] px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            {isSavingStartDate ? (
                                                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                    Saving…
                                                </p>
                                            ) : taskState.start_date ? (
                                                <p className="mt-2 text-sm text-slate-500">
                                                    Starts {formatTaskDate(taskState.start_date)}
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-sm text-slate-500">
                                                    Used to display task duration.
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-3">
                                            <label htmlFor="task-due-date">
                                                <FieldLabel>Due date</FieldLabel>
                                            </label>
                                            <input
                                                id="task-due-date"
                                                name="task_due_date"
                                                type="date"
                                                disabled={isSavingDueDate}
                                                min={taskState.start_date ? new Date(taskState.start_date).toISOString().split("T")[0] : undefined}
                                                value={taskState.due_date ? new Date(taskState.due_date).toISOString().split("T")[0] : ""}
                                                onChange={async (event) => {
                                                    const newDate = event.target.value ? new Date(event.target.value).toISOString() : null;
                                                    setIsSavingDueDate(true);
                                                    const updated = await handleUpdateTask({ due_date: newDate });
                                                    setIsSavingDueDate(false);
                                                    if (updated) {
                                                        await refreshActivities();
                                                    }
                                                }}
                                                className={cn(
                                                    "h-[var(--control-height-md)] w-full rounded-[var(--radius-lg)] border border-[var(--control-border)] bg-[var(--control-bg)] px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
                                                    dueDateTone.isOverdue && "border-[var(--danger-border)] text-[var(--danger-fg)]"
                                                )}
                                            />
                                            {isSavingDueDate ? (
                                                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                    Saving…
                                                </p>
                                            ) : taskState.due_date ? (
                                                <p className={cn("mt-2 text-sm", dueDateTone.isOverdue ? "text-[var(--danger-fg)]" : "text-slate-500")}>
                                                    {dueDateTone.isOverdue ? "Overdue" : `Due ${formatTaskDate(taskState.due_date)}`}
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-sm text-slate-500">
                                                    Used for team scheduling.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </SectionCard>
                            </aside>
                        </div>
                    </div>
                    <div className="sticky bottom-0 z-10 border-t border-border/70 bg-[var(--modal-surface)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl md:hidden">
                        <TaskCommentComposer
                            activeMentionIndex={activeMentionIndex}
                            buttonClassName="h-8 w-8 shrink-0 touch-manipulation rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            comment={comment}
                            filteredMentionMembers={filteredMentionMembers}
                            formClassName="relative"
                            inputRef={commentInputRef}
                            isSubmittingComment={isSubmittingComment}
                            mentionQuery={mentionQuery}
                            mentionRange={mentionRange}
                            name="task_comment_mobile"
                            placeholder="Write a comment…"
                            rows={1}
                            textareaClassName="min-h-8 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:!outline-none focus:!ring-0 focus:!ring-offset-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
                            textareaId="task-comment-mobile"
                            onChange={handleCommentChange}
                            onKeyDown={handleCommentKeyDown}
                            onKeyUp={handleCommentKeyUp}
                            onMentionStateUpdate={updateMentionState}
                            onSelectMention={selectMention}
                            onSubmit={handleSend}
                        />
                    </div>
                </div>

                <ConfirmationDialog
                    isOpen={showDeleteDialog}
                    title="Delete Task"
                    description={`Are you sure you want to delete "${taskState.title}"? This action cannot be undone.`}
                    confirmText="Delete Task"
                    variant="danger"
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteDialog(false)}
                />

                <ConfirmationDialog
                    isOpen={pendingReplace !== null}
                    title={
                        pendingReplace && pendingReplace.collisions.length > 1
                            ? `Replace ${pendingReplace.collisions.length} attachments?`
                            : "Replace attachment?"
                    }
                    description={
                        pendingReplace && pendingReplace.collisions.length > 1
                            ? `These files already exist and will be replaced: ${pendingReplace.collisions.join(", ")}. The current versions will be removed and replaced with the files you just selected.`
                            : `"${pendingReplace?.collisions[0] ?? ""}" already exists on this task. The current version will be removed and replaced with the file you just selected.`
                    }
                    confirmText={pendingReplace && pendingReplace.collisions.length > 1 ? "Replace files" : "Replace"}
                    variant="warning"
                    isLoading={isUploading}
                    onConfirm={confirmReplace}
                    onCancel={cancelReplace}
                />

                <TaskDetailPreviewOverlays
                    activePdfPreview={activePdfPreview}
                    imageAttachments={imageAttachments}
                    imagePreviewIndex={imagePreviewIndex}
                    onCloseImagePreview={() => setImagePreviewIndex(null)}
                    onClosePdfPreview={() => setActivePdfPreview(null)}
                />
        </DialogShell>
    );

    return modal;
}
