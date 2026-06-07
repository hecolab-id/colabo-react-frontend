"use client";

import Image from "@/components/app-image";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentType,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
    Activity,
    Check,
    CheckSquare,
    ChevronDown,
    Edit2,
    Eye,
    ExternalLink,
    File,
    FileCode,
    FileText,
    Flag,
    Loader2,
    Paperclip,
    Presentation,
    Send,
    Sheet,
    Trash2,
    Upload,
    User,
    X,
} from "lucide-react";
import { Comment, ActivityLog, Checklist as ChecklistType, CommentMention, LinkPreview, Task, User as AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    addComment,
    createChecklist,
    deleteTask,
    getProjectColumns,
    getChecklists,
    getComments,
    getLinkPreview,
    getTask,
    getTaskActivities,
    updateTask,
    uploadFile,
} from "@/lib/api";
import { Checklist } from "./checklist";
import { useStore } from "@/lib/store";
import { useUsage } from "@/lib/hooks/use-billing";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { LabelSelector } from "@/components/modals/label-selector";
import { AiTitleRefineBanner, AiTitleRefineButton, useAiTitleRefine } from "@/components/ai/ai-title-refine";
import {
    formatTaskDate,
    formatTaskDateTime,
    getDueDateTone,
    priorityToneMap,
    statusToneMap,
} from "@/lib/task-ui";
import type { Column } from "@/lib/types";

interface TaskDetailModalProps {
    task: Task;
    projectColumns?: Column[];
    onClose: () => void;
    onDelete?: (taskId: string) => void | Promise<unknown>;
    onUpdate?: (task: Task) => void;
}

type MentionDraft = Pick<CommentMention, "user_id" | "display_text" | "start" | "end"> & {
    local_id: string;
    user: AppUser;
};

function canReadAllProjects(member: AppUser) {
    return member.roles?.some((role) => (
        ["OWNER", "ADMIN"].includes(role.name.toUpperCase()) ||
        role.permissions?.some((permission) => permission.name === "projects:read_all")
    )) ?? false;
}

const urlPattern = /https?:\/\/[^\s<>"')\]]+/i;

function extractFirstUrl(value: string) {
    const match = value.match(urlPattern);
    return match?.[0]?.replace(/[.,!?;:]+$/, "") || null;
}

function CommentLinkPreview({ url }: { url: string }) {
    const [preview, setPreview] = useState<LinkPreview | null>(null);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

    useEffect(() => {
        const controller = new AbortController();

        getLinkPreview(url, controller.signal)
            .then((data) => {
                setPreview(data);
                setStatus("success");
            })
            .catch((error) => {
                if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
                    return;
                }
                setStatus("error");
            });

        return () => controller.abort();
    }, [url]);

    if (status === "error") {
        return null;
    }

    if (status === "loading") {
        return (
            <div className="mt-3 h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80" aria-label="Loading link preview" />
        );
    }

    if (!preview) {
        return null;
    }

    const host = (() => {
        try {
            return new URL(preview.url).hostname.replace(/^www\./, "");
        } catch {
            return preview.site_name || "Link";
        }
    })();

    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
            {preview.image ? (
                <div
                    className="hidden w-28 shrink-0 bg-slate-100 bg-cover bg-center sm:block"
                    style={{ backgroundImage: `url("${preview.image.replace(/"/g, "%22")}")` }}
                    aria-hidden="true"
                />
            ) : null}
            <div className="min-w-0 flex-1 p-3">
                <div className="mb-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    <span className="truncate">{preview.site_name || host}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{preview.title || host}</p>
                {preview.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preview.description}</p>
                ) : null}
            </div>
        </a>
    );
}

function SectionCard({
    title,
    icon: Icon,
    action,
    children,
    className,
    contentClassName,
}: {
    title: string;
    icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section
            className={cn(
                "rounded-[1.35rem] border border-slate-200/70 bg-white/82 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)] md:rounded-[1.55rem] md:p-5",
                className,
            )}
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-normal text-slate-950">
                    {Icon ? <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                    {title}
                </h3>
                {action}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}

function EmptyState({
    title,
    action,
}: {
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="rounded-[1.15rem] border border-dashed border-slate-300/80 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
            <p>{title}</p>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

function FieldLabel({ children }: { children: ReactNode }) {
    return <span className="mb-2 block text-xs font-medium text-slate-500">{children}</span>;
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
    const sectionRefs = {
        description: useRef<HTMLSpanElement>(null),
        checklist: useRef<HTMLSpanElement>(null),
        comments: useRef<HTMLSpanElement>(null),
        attachments: useRef<HTMLSpanElement>(null),
        settings: useRef<HTMLSpanElement>(null),
        danger: useRef<HTMLSpanElement>(null),
    };

    const [taskState, setTaskState] = useState(task);
    const [comment, setComment] = useState("");
    const [draftMentions, setDraftMentions] = useState<MentionDraft[]>([]);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [comments, setComments] = useState<Comment[]>(task.comments || []);
    const [checklists, setChecklists] = useState<ChecklistType[]>(task.checklists || []);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [projectColumns, setProjectColumns] = useState<Column[]>(initialProjectColumns || []);
    const [isProjectColumnsLoading, setIsProjectColumnsLoading] = useState(!initialProjectColumns);
    const [hasLoadedProjectColumns, setHasLoadedProjectColumns] = useState(Boolean(initialProjectColumns));
    const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
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
    const [isAssigning, setIsAssigning] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [activeMobileSection, setActiveMobileSection] = useState<"description" | "checklist" | "comments" | "attachments" | "settings">("description");
    const [isMobileDangerOpen, setIsMobileDangerOpen] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingDone, setIsMarkingDone] = useState(false);
    const [doneActionError, setDoneActionError] = useState<string | null>(null);

    const [attachments, setAttachments] = useState<string[]>(task.attachments || []);
    const [isUploading, setIsUploading] = useState(false);
    const [showAllAttachments, setShowAllAttachments] = useState(false);
    const [activePdfPreview, setActivePdfPreview] = useState<{ url: string; name: string } | null>(null);

    useEffect(() => {
        setTaskState(task);
        setTitle(task.title);
        setDescription(task.description || "");
        setComment("");
        setDraftMentions([]);
        setMentionQuery("");
        setMentionRange(null);
        setActiveMentionIndex(0);
        setComments(task.comments || []);
        setChecklists(task.checklists || []);
        setLabels(task.labels || []);
        setAttachments(task.attachments || []);
        setActivePdfPreview(null);
        setIsEditingTitle(false);
        setIsEditingDesc(false);
        setIsAssigning(false);
        setIsPriorityOpen(false);
        setShowAllAttachments(false);
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
    }, [initialProjectColumns, task]);

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
                setAttachments(fetchedTask.attachments || []);
            }
        } catch (error) {
            console.error("Failed to load task details", error);
            setDetailsError("Some task details could not be loaded.");
        } finally {
            setIsLoadingDetails(false);
            setIsProjectColumnsLoading(false);
        }
    }, [initialProjectColumns, task.id, task.project_id]);

    useEffect(() => {
        void loadTaskDetails();
    }, [loadTaskDetails]);

    useEscapeKey(!showDeleteDialog, onClose);
    useEscapeKey(isAssigning || isPriorityOpen, () => {
        setIsAssigning(false);
        setIsPriorityOpen(false);
    });

    useEffect(() => {
        if (!isAssigning && !isPriorityOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (isAssigning && assigneeRef.current && !assigneeRef.current.contains(target)) {
                setIsAssigning(false);
            }
            if (isPriorityOpen && priorityRef.current && !priorityRef.current.contains(target)) {
                setIsPriorityOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isAssigning, isPriorityOpen]);

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

    const handleUpdateTask = async (updates: Partial<Task>) => {
        try {
            const updated = await updateTask(task.id, updates);
            setTaskState(updated);
            setTitle(updated.title);
            setDescription(updated.description || "");
            setAttachments(updated.attachments || []);
            setLabels(updated.labels || []);
            onUpdate?.(updated);
            return updated;
        } catch (error) {
            console.error("Failed to update task:", error);
            return null;
        }
    };

    const refreshActivities = async () => {
        const logs = await getTaskActivities(task.id);
        setActivities(logs || []);
    };

    const syncDraftMentions = (nextComment: string, mentions: MentionDraft[]) => {
        let searchFrom = 0;
        const nextMentions: MentionDraft[] = [];

        [...mentions]
            .sort((left, right) => left.start - right.start)
            .forEach((mention) => {
                const foundIndex = nextComment.indexOf(mention.display_text, searchFrom);
                if (foundIndex === -1) {
                    return;
                }

                nextMentions.push({
                    ...mention,
                    start: foundIndex,
                    end: foundIndex + mention.display_text.length,
                });
                searchFrom = foundIndex + mention.display_text.length;
            });

        return nextMentions;
    };

    const updateMentionState = (nextComment: string, cursorPosition: number) => {
        const atIndex = nextComment.lastIndexOf("@", Math.max(0, cursorPosition - 1));

        if (atIndex === -1 || (atIndex > 0 && !/\s/.test(nextComment[atIndex - 1] || ""))) {
            setMentionRange(null);
            setMentionQuery("");
            setActiveMentionIndex(0);
            return;
        }

        const query = nextComment.slice(atIndex + 1, cursorPosition);
        if (query.includes(" ") || query.includes("\n")) {
            setMentionRange(null);
            setMentionQuery("");
            setActiveMentionIndex(0);
            return;
        }

        setMentionRange({ start: atIndex, end: cursorPosition });
        setMentionQuery(query);
        setActiveMentionIndex(0);
    };

    const handleSend = async (event: FormEvent) => {
        event.preventDefault();
        if (!comment.trim()) return;

        try {
            const newComment = await addComment(task.id, {
                content: comment,
                mentions: draftMentions.map((mention) => ({
                    user_id: mention.user_id,
                    display_text: mention.display_text,
                    start: mention.start,
                    end: mention.end,
                })),
            });
            let nextComments: Comment[] = [];
            setComments((current) => {
                nextComments = [newComment, ...current];
                return nextComments;
            });
            setComment("");
            setDraftMentions([]);
            setMentionQuery("");
            setMentionRange(null);
            setActiveMentionIndex(0);

            const updatedTask = {
                ...taskState,
                comments: nextComments,
                comments_count: nextComments.length,
            };
            setTaskState(updatedTask);
            onUpdate?.(updatedTask);
        } catch (error) {
            console.error(error);
        }
    };

    const handleTitleSave = async () => {
        const nextTitle = title.trim();
        if (!nextTitle) {
            setTitle(taskState.title);
            setIsEditingTitle(false);
            return;
        }

        if (nextTitle !== taskState.title) {
            await handleUpdateTask({ title: nextTitle });
            await refreshActivities();
        }

        setIsEditingTitle(false);
    };

    const handleDescSave = async () => {
        if (description !== (taskState.description || "")) {
            await handleUpdateTask({ description });
            await refreshActivities();
        }
        setIsEditingDesc(false);
    };

    const handleAssign = async (userId: string | null) => {
        const updated = await handleUpdateTask({ assignee_id: userId });
        if (updated) {
            setIsAssigning(false);
            await refreshActivities();
        }
    };

    const handlePriorityChange = async (priority: string) => {
        const updated = await handleUpdateTask({ priority: priority as Task["priority"] });
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
        if (!newChecklistTitle.trim()) return;

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

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const maxFileSize = 5 * 1024 * 1024;
        const oversizedFiles = Array.from(files).filter((file) => file.size > maxFileSize);

        if (oversizedFiles.length > 0) {
            alert(`The following files exceed the 5 MB limit:\n${oversizedFiles.map((file) => file.name).join("\n")}`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsUploading(true);

        try {
            const uploadedFiles = await Promise.all(Array.from(files).map((file) => uploadFile(file)));
            const newAttachments = [...attachments, ...uploadedFiles.map((file) => file.url)];
            const updated = await updateTask(task.id, { attachments: newAttachments });

            setAttachments(newAttachments);
            setTaskState(updated);
            onUpdate?.(updated);
        } catch (error) {
            console.error("Failed to upload file:", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveAttachment = async (url: string) => {
        const newAttachments = attachments.filter((item) => item !== url);

        try {
            const updated = await updateTask(task.id, { attachments: newAttachments });
            setAttachments(newAttachments);
            setTaskState(updated);
            onUpdate?.(updated);
        } catch (error) {
            console.error("Failed to remove attachment:", error);
        }
    };

    const getFileName = (url: string) => {
        try {
            const path = new URL(url, window.location.origin).pathname;
            const urlParts = path.split("/");
            const fullFileName = urlParts[urlParts.length - 1] || "attachment";
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i;
            const match = fullFileName.match(uuidRegex);

            let cleanName = fullFileName;
            if (match && match[1]) {
                cleanName = match[1];
            }

            cleanName = cleanName.replace(/^\d+_/, "");
            return decodeURIComponent(cleanName);
        } catch {
            return "attachment";
        }
    };

    const getAttachmentPath = (url: string) => {
        try {
            return new URL(url, window.location.origin).pathname.toLowerCase();
        } catch {
            return url.split("?")[0].split("#")[0].toLowerCase();
        }
    };

    const isImageFile = (url: string) => {
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
        const path = getAttachmentPath(url);
        return imageExtensions.some((extension) => path.endsWith(extension));
    };

    const isPdfFile = (url: string) => {
        return getAttachmentPath(url).endsWith(".pdf");
    };

    const getPdfPreviewUrl = (url: string) => {
        return `${url.split("#")[0]}#toolbar=1&navpanes=0&view=FitH`;
    };

    const getFileIcon = (url: string) => {
        const fileName = getAttachmentPath(url);

        if (fileName.endsWith(".pdf")) {
            return { icon: File, color: "border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]" };
        }
        if (fileName.endsWith(".doc") || fileName.endsWith(".docx") || fileName.endsWith(".txt") || fileName.endsWith(".rtf")) {
            return { icon: FileText, color: "border border-border bg-[var(--surface-overlay)] text-foreground" };
        }
        if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx") || fileName.endsWith(".csv")) {
            return { icon: Sheet, color: "border border-[var(--priority-low-border)] bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]" };
        }
        if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx")) {
            return { icon: Presentation, color: "border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]" };
        }
        if (
            fileName.endsWith(".js") ||
            fileName.endsWith(".jsx") ||
            fileName.endsWith(".ts") ||
            fileName.endsWith(".tsx") ||
            fileName.endsWith(".py") ||
            fileName.endsWith(".java") ||
            fileName.endsWith(".cpp") ||
            fileName.endsWith(".go")
        ) {
            return { icon: FileCode, color: "border border-border bg-[var(--surface-overlay)] text-primary" };
        }

        return { icon: FileText, color: "border border-border bg-muted text-muted-foreground" };
    };

    const priority = priorityToneMap[taskState.priority] || priorityToneMap.MEDIUM;
    const status = statusToneMap[taskState.status] || statusToneMap.TODO;
    const dueDateTone = getDueDateTone(taskState.due_date || undefined);
    const mentionableMembers = useMemo(() => {
        const membersById = new Map<string, AppUser>();
        const addMembers = (members?: AppUser[]) => {
            members?.forEach((member) => {
                if (member.id !== currentUser?.id) {
                    membersById.set(member.id, member);
                }
            });
        };

        addMembers(taskState.project?.members);

        if (taskState.project?.is_private) {
            addMembers(currentTeam?.members?.filter(canReadAllProjects));
        } else {
            addMembers(taskState.project?.team?.members);
            addMembers(currentTeam?.members);
        }

        return [...membersById.values()].sort((left, right) => left.name.localeCompare(right.name));
    }, [
        currentTeam?.members,
        currentUser?.id,
        taskState.project?.is_private,
        taskState.project?.members,
        taskState.project?.team?.members,
    ]);
    const filteredMentionMembers = useMemo(() => {
        if (!mentionRange) return [];

        const normalizedQuery = mentionQuery.trim().toLowerCase();
        return mentionableMembers.filter((member) =>
            normalizedQuery.length === 0 ||
            member.name.toLowerCase().includes(normalizedQuery) ||
            member.email.toLowerCase().includes(normalizedQuery)
        );
    }, [mentionQuery, mentionRange, mentionableMembers]);
    const visibleAttachments = showAllAttachments ? attachments : attachments.slice(0, 3);
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
    const selectMention = (member: AppUser) => {
        if (!mentionRange) return;

        const mentionText = `@${member.name}`;
        const trailingCharacter = comment[mentionRange.end] || "";
        const needsTrailingSpace = trailingCharacter.length > 0 && !/\s/.test(trailingCharacter);
        const replacement = `${mentionText}${needsTrailingSpace ? " " : ""}`;
        const nextComment = `${comment.slice(0, mentionRange.start)}${replacement}${comment.slice(mentionRange.end)}`;
        const syncedMentions = syncDraftMentions(nextComment, [
            ...draftMentions,
            {
                local_id: `${member.id}-${Date.now()}`,
                user_id: member.id,
                display_text: mentionText,
                start: mentionRange.start,
                end: mentionRange.start + mentionText.length,
                user: member,
            },
        ]);

        setComment(nextComment);
        setDraftMentions(syncedMentions);
        setMentionQuery("");
        setMentionRange(null);
        setActiveMentionIndex(0);

        requestAnimationFrame(() => {
            if (!commentInputRef.current) return;
            const caretPosition = mentionRange.start + replacement.length;
            commentInputRef.current.focus();
            commentInputRef.current.setSelectionRange(caretPosition, caretPosition);
        });
    };

    const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        const nextComment = event.target.value;
        setComment(nextComment);
        setDraftMentions(syncDraftMentions(nextComment, draftMentions));
        updateMentionState(nextComment, event.target.selectionStart ?? nextComment.length);
    };

    const handleCommentKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (!mentionRange || filteredMentionMembers.length === 0) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveMentionIndex((current) => (current + 1) % filteredMentionMembers.length);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveMentionIndex((current) => (current - 1 + filteredMentionMembers.length) % filteredMentionMembers.length);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            selectMention(filteredMentionMembers[activeMentionIndex]);
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            setMentionQuery("");
            setMentionRange(null);
            setActiveMentionIndex(0);
        }
    };

    const handleCommentKeyUp = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
            return;
        }

        updateMentionState(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length);
    };

    const renderCommentContent = (item: Comment) => {
        const mentions = [...(item.mentions || [])].sort((left, right) => left.start - right.start);
        if (mentions.length === 0) {
            return <p className="mt-2 break-words text-sm leading-6 text-slate-600">{item.content}</p>;
        }

        const parts: ReactNode[] = [];
        let cursor = 0;

        mentions.forEach((mention, index) => {
            if (mention.start > cursor) {
                parts.push(<span key={`${item.id}-text-${index}`}>{item.content.slice(cursor, mention.start)}</span>);
            }

            parts.push(
                <span
                    key={mention.id}
                    className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
                >
                    {item.content.slice(mention.start, mention.end)}
                </span>
            );
            cursor = mention.end;
        });

        if (cursor < item.content.length) {
            parts.push(<span key={`${item.id}-tail`}>{item.content.slice(cursor)}</span>);
        }

        return <p className="mt-2 break-words text-sm leading-6 text-slate-600">{parts}</p>;
    };

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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(15,23,42,0.46)] p-0 backdrop-blur-xl md:p-6"
            onClick={onClose}
        >
            <div
                className="h-[100dvh] w-full overflow-hidden border-0 border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,251,0.96))] shadow-none overscroll-contain md:h-auto md:max-h-[96vh] md:max-w-7xl md:rounded-[2rem] md:border md:border-white/70 md:shadow-[0_46px_140px_-56px_rgba(15,23,42,0.78)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex h-[100dvh] flex-col overflow-hidden md:max-h-[96vh] md:h-auto">
                    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/88 px-4 py-3 backdrop-blur-2xl md:px-7 md:py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-2 md:space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn("rounded-full px-3 py-1 text-xs font-medium tracking-normal", status.className)}>
                                            {status.label}
                                        </span>
                                        <span className={cn("rounded-full px-3 py-1 text-xs font-medium tracking-normal", priority.badgeClassName)}>
                                            {priority.label}
                                        </span>
                                        {taskState.due_date && (
                                            <span className={cn("rounded-full px-3 py-1 text-xs font-medium tracking-normal", dueDateTone.className)}>
                                                {dueDateTone.label || `Due ${formatTaskDate(taskState.due_date)}`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleMarkAsDone}
                                            disabled={isMarkingDone || isProjectColumnsLoading || isTaskDone || !doneColumn}
                                            className={cn(
                                                "inline-flex touch-manipulation items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4",
                                                isTaskDone
                                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 focus-visible:ring-emerald-100"
                                                    : "bg-primary text-primary-foreground hover:opacity-95 focus-visible:ring-primary/15",
                                                (isMarkingDone || isProjectColumnsLoading || (!doneColumn && !isTaskDone)) && "cursor-not-allowed opacity-60"
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
                                                    {isTaskDone ? "Done" : "Mark as Done"}
                                                </>
                                            )}
                                        </button>
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
                                                    className="block w-full rounded-2xl border border-slate-300 bg-white pl-4 pr-12 py-3 text-xl font-semibold tracking-tight text-slate-950 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 md:text-2xl"
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
                                            <button
                                                type="button"
                                                onClick={handleTitleSave}
                                                aria-label="Save title"
                                                className="touch-manipulation rounded-2xl border border-slate-300 bg-white p-3 text-slate-700 transition-[border-color,background-color,color] hover:border-primary/30 hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                            >
                                                <Check className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div onMouseDown={(e) => e.preventDefault()}>
                                            <AiTitleRefineBanner state={titleRefiner} />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTitle(true)}
                                        className="group flex w-full items-start gap-2 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                    >
                                        <h2 className="min-w-0 flex-1 text-balance text-2xl font-semibold tracking-normal text-slate-950 md:text-[2rem]">
                                            {taskState.title}
                                        </h2>
                                        <Edit2 className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close task details"
                                className="touch-manipulation rounded-full border border-slate-200 bg-white/90 p-3 text-slate-600 transition-[border-color,background-color,color] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </header>

                    <div className="sticky top-[88px] z-10 border-b border-white/70 bg-white/88 px-4 py-2 backdrop-blur-2xl md:hidden">
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
                                        "shrink-0 touch-manipulation rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                        activeMobileSection === id ? "bg-primary-dark text-white" : "border border-slate-200 bg-slate-100 text-slate-600"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div ref={bodyRef} className="flex-1 overflow-y-auto">
                        {detailsError ? (
                            <div className="mx-4 mt-4 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span>{detailsError}</span>
                                    <button
                                        type="button"
                                        onClick={() => void loadTaskDetails()}
                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {isLoadingDetails ? (
                            <div className="mx-4 mt-4 flex items-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-500 md:mx-6">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Loading task details...
                            </div>
                        ) : null}
                        <div className="grid gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-4 md:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.75fr)] md:gap-5 md:p-6 md:pb-6">
                            <div className="space-y-5">
                                <SectionCard title="Description" className="scroll-mt-28" contentClassName="space-y-3">
                                    <span ref={sectionRefs.description} className="block h-0" aria-hidden="true" />
                                    {isEditingDesc ? (
                                        <div className="space-y-3">
                                            <RichTextEditor
                                                content={description}
                                                onChange={setDescription}
                                                placeholder="Add a detailed description…"
                                                className="min-h-[180px]"
                                                enableImageUpload
                                                onImageUpload={async (file) => (await uploadFile(file)).url}
                                                maxImageSizeMb={maxImageSizeMb}
                                                onUploadingChange={setIsUploadingDescImage}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDescription(taskState.description || "");
                                                        setIsEditingDesc(false);
                                                    }}
                                                    className="touch-manipulation rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDescSave}
                                                    disabled={isUploadingDescImage}
                                                    className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isUploadingDescImage ? "Mengunggah gambar…" : "Save Description"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingDesc(true)}
                                            className="w-full rounded-[1.2rem] border border-slate-200/80 bg-white/58 p-4 text-left transition-[border-color,background-color,transform] hover:border-primary/30 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                        >
                                            {taskState.description ? (
                                                <div
                                                    className="prose prose-sm max-w-none break-words text-slate-700"
                                                    dangerouslySetInnerHTML={{ __html: taskState.description }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                                                    <span>Add context, links, or acceptance notes.</span>
                                                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Add</span>
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Checklists"
                                    icon={CheckSquare}
                                    className="scroll-mt-28"
                                    action={
                                        !isCreatingChecklist ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingChecklist(true)}
                                                className="touch-manipulation rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                            >
                                                Add Checklist
                                            </button>
                                        ) : null
                                    }
                                >
                                    <span ref={sectionRefs.checklist} className="block h-0" aria-hidden="true" />
                                    <div className="space-y-5">
                                        {checklists.length > 0 ? (
                                            checklists.map((checklist) => (
                                                <div key={checklist.id} className="rounded-[1.2rem] border border-slate-200/70 bg-white/70 p-4">
                                                    <Checklist
                                                        checklist={checklist}
                                                        onUpdate={handleUpdateChecklist}
                                                        onDelete={handleDeleteChecklist}
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <EmptyState title="No checklist yet. Break the work into steps so progress is easy to track." />
                                        )}

                                        {isCreatingChecklist && (
                                            <form onSubmit={handleCreateChecklist} className="rounded-[1.2rem] border border-slate-300 bg-white p-4">
                                                <label htmlFor="checklist-title" className="mb-2 block text-xs font-medium text-slate-500">
                                                    Checklist title
                                                </label>
                                                <input
                                                    id="checklist-title"
                                                    name="checklist_title"
                                                    type="text"
                                                    value={newChecklistTitle}
                                                    onChange={(event) => setNewChecklistTitle(event.target.value)}
                                                    placeholder="Planning pass…"
                                                    autoFocus
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                                                />
                                                <div className="mt-3 flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCreatingChecklist(false)}
                                                        className="touch-manipulation rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={!newChecklistTitle.trim()}
                                                        className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                    >
                                                        Create
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {totalChecklistItems > 0 && (
                                            <p className="text-sm text-slate-500">
                                                {completedChecklistItems} of {totalChecklistItems} checklist items completed.
                                            </p>
                                        )}
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title={`Attachments (${attachments.length})`}
                                    icon={Paperclip}
                                    className="scroll-mt-28"
                                    action={
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="touch-manipulation inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                        Uploading…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                                                        Upload
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                aria-label="Upload attachments"
                                            />
                                        </>
                                    }
                                >
                                    <span ref={sectionRefs.attachments} className="block h-0" aria-hidden="true" />
                                    {attachments.length > 0 ? (
                                        <div className="space-y-3">
                                            {visibleAttachments.map((url, index) => {
                                                const isImage = isImageFile(url);
                                                const isPdf = isPdfFile(url);
                                                const fileInfo = getFileIcon(url);
                                                const FileIcon = fileInfo.icon;
                                                const fileName = getFileName(url);

                                                return (
                                                    <div
                                                        key={`${url}-${index}`}
                                                        className="flex items-center gap-3 rounded-[1.15rem] border border-slate-200/80 bg-white/68 p-3 transition-[border-color,background-color] hover:border-primary/30 hover:bg-white"
                                                    >
                                                        {isImage ? (
                                                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] border border-border bg-slate-100">
                                                                <Image
                                                                    src={url}
                                                                    alt={fileName}
                                                                    fill
                                                                    sizes="56px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem]", fileInfo.color)}>
                                                                <FileIcon className="h-6 w-6" aria-hidden="true" />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Stored with this task for quick reference.
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            {isPdf ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActivePdfPreview({ url, name: fileName })}
                                                                    aria-label={`Preview ${fileName}`}
                                                                    className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                                >
                                                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                                                </button>
                                                            ) : null}
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                aria-label={`Open ${fileName} in a new tab`}
                                                                className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                            >
                                                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveAttachment(url)}
                                                                aria-label={`Remove ${fileName}`}
                                                                className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--danger-fg)]/15"
                                                            >
                                                                <X className="h-4 w-4" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {attachments.length > 3 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllAttachments((current) => !current)}
                                                    className="touch-manipulation text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    {showAllAttachments ? "Show less" : `View all attachments (${attachments.length - 3} hidden)`}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            title="No attachments yet. Upload references, screenshots, or specs so the task stays self-contained."
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    Upload a file
                                                </button>
                                            }
                                        />
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title={activeTab === "comments" ? `Comments (${comments.length})` : "Activity"}
                                    icon={activeTab === "comments" ? Send : Activity}
                                    className="scroll-mt-28"
                                    action={
                                        <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab("comments")}
                                                className={cn(
                                                    "touch-manipulation rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                    activeTab === "comments"
                                                        ? "bg-white text-slate-950 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-950"
                                                )}
                                            >
                                                Comments {comments.length}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab("activity")}
                                                className={cn(
                                                    "touch-manipulation rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                    activeTab === "activity"
                                                        ? "bg-white text-slate-950 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-950"
                                                )}
                                            >
                                                Activity {activities.length}
                                            </button>
                                        </div>
                                    }
                                >
                                    <span ref={sectionRefs.comments} className="block h-0" aria-hidden="true" />
                                    {activeTab === "comments" ? (
                                        <div className="space-y-4">
                                            {comments.length > 0 ? (
                                                comments.map((item) => {
                                                    const firstUrl = extractFirstUrl(item.content);

                                                    return (
                                                        <article key={item.id} className="flex gap-3 rounded-[1.1rem] border border-slate-200/70 bg-white/62 p-3">
                                                            <Avatar user={item.user} size="md" tone="tint" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                    <span className="text-sm font-semibold text-slate-950">{item.user.name}</span>
                                                                    <span className="text-xs text-slate-500">{formatTaskDateTime(item.created_at)}</span>
                                                                </div>
                                                                {renderCommentContent(item)}
                                                                {firstUrl ? <CommentLinkPreview key={firstUrl} url={firstUrl} /> : null}
                                                            </div>
                                                        </article>
                                                    );
                                                })
                                            ) : (
                                                <EmptyState title="No comments yet. Capture a decision, blocker, or quick follow-up." />
                                            )}

                                            <form onSubmit={handleSend} className="sticky bottom-0 z-20 hidden rounded-[1.25rem] border border-slate-200/80 bg-white/94 p-3 shadow-[0_-18px_46px_-34px_rgba(15,23,42,0.34)] backdrop-blur-xl md:block">
                                                <label htmlFor="task-comment" className="sr-only">Write a comment</label>
                                                <div className="relative">
                                                    <div className="flex gap-2">
                                                        <textarea
                                                            ref={commentInputRef}
                                                            id="task-comment"
                                                            name="task_comment"
                                                            value={comment}
                                                            onChange={handleCommentChange}
                                                            onKeyDown={handleCommentKeyDown}
                                                            onClick={(event) => updateMentionState(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                                                            onKeyUp={handleCommentKeyUp}
                                                            placeholder="Write a comment… Use @ to mention a project member."
                                                            autoComplete="off"
                                                            rows={3}
                                                            className="min-w-0 flex-1 resize-none rounded-[1rem] border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-950 outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!comment.trim()}
                                                            aria-label="Send comment"
                                                            className="touch-manipulation self-end rounded-[1rem] bg-primary p-2.5 text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                        >
                                                            <Send className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    </div>

                                                    {mentionRange && (filteredMentionMembers.length > 0 || mentionQuery.trim().length > 0) && (
                                                        <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)]">
                                                            <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                                                                Mention a project member
                                                            </div>
                                                            <div className="max-h-56 overflow-y-auto p-2">
                                                                {filteredMentionMembers.length > 0 ? (
                                                                    filteredMentionMembers.map((member, index) => (
                                                                        <button
                                                                            key={member.id}
                                                                            type="button"
                                                                            onClick={() => selectMention(member)}
                                                                            className={cn(
                                                                                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                                                index === activeMentionIndex ? "bg-primary/10 text-primary" : "hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            <Avatar user={member} size="sm" tone="tint" />
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="truncate text-sm font-medium text-slate-950">{member.name}</div>
                                                                                <div className="truncate text-xs text-slate-500">{member.email}</div>
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="px-3 py-4 text-sm text-slate-500">No matching member.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activities.length > 0 ? (
                                                activities.map((log) => (
                                                    <article key={log.id} className="flex gap-3 border-b border-slate-200/70 px-1 py-3 text-sm last:border-b-0">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                            <Activity className="h-4 w-4" aria-hidden="true" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="break-words leading-6 text-slate-700">
                                                                <span className="font-semibold text-slate-950">{log.user.name}</span>{" "}
                                                                <span className="text-slate-600">
                                                                    {log.action_type === "STATUS_CHANGE"
                                                                        ? `changed status from ${log.old_value || "None"} to ${log.new_value}`
                                                                        : log.action_type === "ASSIGNED"
                                                                            ? `assigned this task to ${log.new_value}`
                                                                            : log.action_type === "CREATED"
                                                                                ? "created this task"
                                                                                : log.action_type === "TITLE_CHANGE"
                                                                                    ? `renamed task from "${log.old_value}" to "${log.new_value}"`
                                                                                    : log.action_type === "DESCRIPTION_CHANGE"
                                                                                        ? "updated the description"
                                                                                        : log.action_type === "PRIORITY_CHANGE"
                                                                                            ? `changed priority from ${log.old_value} to ${log.new_value}`
                                                                                            : log.action_type === "TASK_CREATED"
                                                                                                ? "created this task"
                                                                                                : log.action_type === "TASK_MOVED"
                                                                                                    ? `moved this task to ${log.metadata?.to_column_name || log.new_value || "another column"}`
                                                                                                    : log.action_type === "TASK_STATUS_CHANGED"
                                                                                                        ? `changed status from ${log.old_value || "None"} to ${log.new_value}`
                                                                                                        : log.action_type === "TASK_ASSIGNED"
                                                                                                            ? `assigned this task to ${log.metadata?.assignee_user_name || log.new_value || "someone"}`
                                                                                                            : log.action_type === "TASK_RENAMED"
                                                                                                                ? `renamed task from "${log.old_value}" to "${log.new_value}"`
                                                                                                                : log.action_type === "TASK_DESCRIPTION_UPDATED"
                                                                                                                    ? "updated the description"
                                                                                                                    : log.action_type === "TASK_PRIORITY_CHANGED"
                                                                                                                        ? `changed priority from ${log.old_value} to ${log.new_value}`
                                                                                                                        : log.action_type === "TASK_COMMENTED"
                                                                                                                            ? "commented on this task"
                                                                                                                            : "updated this task"}
                                                                </span>
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">{formatTaskDateTime(log.created_at)}</p>
                                                        </div>
                                                    </article>
                                                ))
                                            ) : (
                                                <EmptyState title="No activity yet. Changes to this task will show up here." />
                                            )}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>

                            <aside className="space-y-5 md:sticky md:top-6 md:self-start">
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
                                                    className="flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-slate-300 bg-white px-3 py-3 text-left transition-[border-color,background-color] hover:border-primary/25 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                >
                                                    <div className="min-w-0 flex items-center gap-3">
                                                        {taskState.assignee ? (
                                                            <Avatar user={taskState.assignee} size="md" tone="tint" className="h-10 w-10" />
                                                        ) : (
                                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">?</span>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-950">
                                                                {taskState.assignee?.name || "Unassigned"}
                                                            </p>
                                                            <p className="truncate text-xs text-slate-500">
                                                                {taskState.assignee ? "Responsible for moving this forward." : "Pick someone from this workspace."}
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
                                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                            >
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-500">
                                                                    <User className="h-4 w-4" aria-hidden="true" />
                                                                </div>
                                                                <span className="text-slate-700">Unassigned</span>
                                                            </button>
                                                            {currentTeam?.members?.map((member) => (
                                                                <button
                                                                    key={member.id}
                                                                    type="button"
                                                                    onClick={() => handleAssign(member.id)}
                                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                                >
                                                                    <Avatar user={member} size="sm" tone="tint" />
                                                                    <span className="min-w-0 flex-1 truncate text-slate-900">{member.name}</span>
                                                                    {taskState.assignee_id === member.id ? (
                                                                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                                                                    ) : null}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4">
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
                                                        "flex w-full items-center justify-between rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
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
                                                                className={cn(
                                                                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                                    taskState.priority === key ? "bg-slate-50" : ""
                                                                )}
                                                            >
                                                                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", config.badgeClassName)}>
                                                                    {config.label}
                                                                </span>
                                                                {taskState.priority === key ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4">
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
                                                <div className="rounded-[1.1rem] border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                                                    Load a team to manage labels for this task.
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4">
                                            <label htmlFor="task-due-date">
                                                <FieldLabel>Due date</FieldLabel>
                                            </label>
                                            <input
                                                id="task-due-date"
                                                name="task_due_date"
                                                type="date"
                                                value={taskState.due_date ? new Date(taskState.due_date).toISOString().split("T")[0] : ""}
                                                onChange={async (event) => {
                                                    const newDate = event.target.value ? new Date(event.target.value).toISOString() : null;
                                                    const updated = await handleUpdateTask({ due_date: newDate });
                                                    if (updated) {
                                                        await refreshActivities();
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full rounded-[1.15rem] border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
                                                    dueDateTone.isOverdue && "border-[var(--danger-border)] text-[var(--danger-fg)]"
                                                )}
                                            />
                                            {taskState.due_date ? (
                                                <p className={cn("mt-2 text-sm", dueDateTone.isOverdue ? "text-[var(--danger-fg)]" : "text-slate-500")}>
                                                    {dueDateTone.isOverdue ? "Overdue" : `Due ${formatTaskDate(taskState.due_date)}`}
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-sm text-slate-500">
                                                    Add a date to make scheduling visible for the team.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Danger Zone" icon={Trash2} className="scroll-mt-28">
                                    <span ref={sectionRefs.danger} className="block h-0" aria-hidden="true" />
                                    <div className="md:hidden">
                                        <button
                                            type="button"
                                            onClick={() => setIsMobileDangerOpen((current) => !current)}
                                            className="flex w-full touch-manipulation items-center justify-between rounded-[1.1rem] border border-[var(--danger-border)]/50 bg-[var(--danger-bg)]/60 px-4 py-3 text-left text-sm font-semibold text-[var(--danger-fg)]"
                                        >
                                            <span>Dangerous actions</span>
                                            <ChevronDown className={cn("h-4 w-4 transition-transform", isMobileDangerOpen && "rotate-180")} />
                                        </button>
                                    </div>
                                    <div className={cn("space-y-4", !isMobileDangerOpen && "hidden md:block")}>
                                        <p className="text-sm leading-6 text-slate-600">
                                            Remove this task if it was created by mistake or the work has moved elsewhere. This cannot be undone.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteDialog(true)}
                                            disabled={isDeleting}
                                            className="touch-manipulation inline-flex items-center gap-2 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2 text-sm font-semibold text-[var(--danger-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--danger-fg)]/15"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            {isDeleting ? "Deleting…" : "Delete Task"}
                                        </button>
                                    </div>
                                </SectionCard>
                            </aside>
                        </div>
                    </div>
                    <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/98 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-sm md:hidden">
                        <form onSubmit={handleSend} className="relative">
                            <label htmlFor="task-comment-mobile" className="sr-only">Write a comment</label>
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={commentInputRef}
                                    id="task-comment-mobile"
                                    name="task_comment_mobile"
                                    value={comment}
                                    onChange={handleCommentChange}
                                    onKeyDown={handleCommentKeyDown}
                                    onClick={(event) => updateMentionState(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                                    onKeyUp={handleCommentKeyUp}
                                    placeholder="Comment or mention with @…"
                                    autoComplete="off"
                                    rows={1}
                                    className="min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                                />
                                <button
                                    type="submit"
                                    disabled={!comment.trim()}
                                    aria-label="Send comment"
                                    className="touch-manipulation rounded-2xl bg-primary p-3 text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                >
                                    <Send className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>

                            {mentionRange && (filteredMentionMembers.length > 0 || mentionQuery.trim().length > 0) && (
                                <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)]">
                                    <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                                        Mention a project member
                                    </div>
                                    <div className="max-h-56 overflow-y-auto p-2">
                                        {filteredMentionMembers.length > 0 ? (
                                            filteredMentionMembers.map((member, index) => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => selectMention(member)}
                                                    className={cn(
                                                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                        index === activeMentionIndex ? "bg-primary/10 text-primary" : "hover:bg-slate-50"
                                                    )}
                                                >
                                                    <Avatar user={member} size="sm" tone="tint" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-slate-950">{member.name}</div>
                                                        <div className="truncate text-xs text-slate-500">{member.email}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-sm text-slate-500">No matching member.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </form>
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

                {activePdfPreview ? (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/56 p-3 backdrop-blur-md md:p-6"
                        onClick={(event) => {
                            event.stopPropagation();
                            setActivePdfPreview(null);
                        }}
                    >
                        <div
                            className="flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-[0_34px_100px_-42px_rgba(15,23,42,0.86)] md:h-[86vh] md:rounded-[2rem]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/92 px-4 py-3 backdrop-blur-xl md:px-5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">{activePdfPreview.name}</p>
                                    <p className="text-xs text-slate-500">PDF preview</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <a
                                        href={activePdfPreview.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                        aria-label={`Open ${activePdfPreview.name} in a new tab`}
                                    >
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setActivePdfPreview(null)}
                                        className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                        aria-label="Close PDF preview"
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <iframe
                                src={getPdfPreviewUrl(activePdfPreview.url)}
                                title={`Preview ${activePdfPreview.name}`}
                                className="min-h-0 flex-1 bg-slate-100"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
