"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
    ArrowLeft,
    CalendarClock,
    ChevronRight,
    Download,
    Edit3,
    ExternalLink,
    File,
    FileCode,
    FileText,
    Globe2,
    Link as LinkIcon,
    Loader2,
    Lock,
    Paperclip,
    Presentation,
    Sparkles,
    Save,
    Sheet,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SettingsField } from "@/components/ui/settings-field";
import { SettingsSection } from "@/components/ui/settings-section";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { toast } from "@/components/ui/toast";
import { useProjectBySlugs, useProjectDocuments, useProjectMeetingNotes, useProjectWeeklySummaries, useGenerateProjectWeeklySummary, useDownloadProjectWeeklySummaryPdf, useUpdateProject, useCreateProjectDocument, useDeleteProjectDocument, useCreateProjectMeetingNote, useUpdateProjectMeetingNote, useDeleteProjectMeetingNote } from "@/lib/hooks/use-project";
import { useTeam } from "@/lib/hooks/use-team";
import { uploadFile } from "@/lib/api";
import { ProjectDocument, ProjectMeetingNote, WeeklyProjectSummary } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ProjectShareSettings } from "@/components/project/project-share-settings";
import { cn } from "@/lib/utils";

type ProjectSettingsTab = "details" | "documents" | "meeting-notes" | "weekly-summary" | "public-share";

function formatBytes(bytes = 0) {
    if (!bytes) return "External reference";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileIcon(document: ProjectDocument) {
    const fileName = `${document.name} ${document.url}`.toLowerCase();

    if (document.kind === "link") {
        return { icon: LinkIcon, color: "border border-sky-100 bg-sky-50 text-sky-700" };
    }
    if (fileName.endsWith(".pdf") || document.mime_type === "application/pdf") {
        return { icon: File, color: "border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]" };
    }
    if (fileName.match(/\.(doc|docx|txt|rtf)$/)) {
        return { icon: FileText, color: "border border-border bg-[var(--surface-overlay)] text-foreground" };
    }
    if (fileName.match(/\.(xls|xlsx|csv)$/)) {
        return { icon: Sheet, color: "border border-[var(--priority-low-border)] bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]" };
    }
    if (fileName.match(/\.(ppt|pptx)$/)) {
        return { icon: Presentation, color: "border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]" };
    }
    if (fileName.match(/\.(js|jsx|ts|tsx|py|java|cpp|go)$/)) {
        return { icon: FileCode, color: "border border-border bg-[var(--surface-overlay)] text-primary" };
    }

    return { icon: FileText, color: "border border-border bg-muted text-muted-foreground" };
}

function toDatetimeLocalValue(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function nowDatetimeLocalValue() {
    return toDatetimeLocalValue(new Date().toISOString());
}

function datetimeLocalToISOString(value: string) {
    return new Date(value).toISOString();
}

function formatMeetingDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatSummaryPeriod(summary: WeeklyProjectSummary) {
    const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
    return `${formatter.format(new Date(summary.period_start))} - ${formatter.format(new Date(summary.period_end))}`;
}

function summaryItems(items?: string[]) {
    return (items || []).filter(Boolean);
}

function statusTone(status: WeeklyProjectSummary["status"]) {
    switch (status) {
        case "COMPLETED":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "FAILED":
            return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
        default:
            return "border-amber-200 bg-amber-50 text-amber-700";
    }
}

function ProjectSettingsPageContent({ params }: { params: Promise<{ teamSlug: string; projectSlug: string }> }) {
    const { teamSlug, projectSlug } = use(params);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useStore((state) => state.user);

    const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProjectBySlugs(teamSlug, projectSlug);
    const { data: team } = useTeam(teamSlug);
    const projectId = project?.id || "";
    const { data: documents = [], isLoading: isDocumentsLoading } = useProjectDocuments(projectId);
    const { data: meetingNotes = [], isLoading: isMeetingNotesLoading } = useProjectMeetingNotes(projectId);
    const { data: weeklySummaries = [], isLoading: isWeeklySummariesLoading } = useProjectWeeklySummaries(projectId);
    const updateProjectMutation = useUpdateProject(projectId);
    const createDocumentMutation = useCreateProjectDocument(projectId);
    const deleteDocumentMutation = useDeleteProjectDocument(projectId);
    const createMeetingNoteMutation = useCreateProjectMeetingNote(projectId);
    const updateMeetingNoteMutation = useUpdateProjectMeetingNote(projectId);
    const deleteMeetingNoteMutation = useDeleteProjectMeetingNote(projectId);
    const generateWeeklySummaryMutation = useGenerateProjectWeeklySummary(projectId);
    const downloadWeeklySummaryMutation = useDownloadProjectWeeklySummaryPdf(projectId);

    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [linkName, setLinkName] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [meetingAt, setMeetingAt] = useState("");
    const [meetingContent, setMeetingContent] = useState("");
    const [editingMeetingNote, setEditingMeetingNote] = useState<ProjectMeetingNote | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState<ProjectSettingsTab>("details");

    useEffect(() => {
        if (!project) return;
        setName(project.name || "");
        setKey(project.key || "");
        setDescription(project.description || "");
        setIsPrivate(Boolean(project.is_private));
    }, [project]);

    useEffect(() => {
        if (!message) return;
        const timeout = window.setTimeout(() => setMessage(""), 3000);
        return () => window.clearTimeout(timeout);
    }, [message]);

    useEffect(() => {
        if (!meetingAt) {
            setMeetingAt(nowDatetimeLocalValue());
        }
    }, [meetingAt]);

    const canManageProject = useMemo(() => {
        if (!team || !currentUser) return false;
        return team.owner_id === currentUser.id || ["OWNER", "ADMIN"].includes((team.role || "").toUpperCase());
    }, [currentUser, team]);
    const canManageMeetingNotes = !!project;

    const isDirty = !!project && (
        name !== project.name ||
        key !== project.key ||
        description !== (project.description || "") ||
        isPrivate !== Boolean(project.is_private)
    );

    const handleSave = async (event: FormEvent) => {
        event.preventDefault();
        if (!project || !canManageProject) return;

        await updateProjectMutation.mutateAsync({
            name: name.trim(),
            key: key.trim().toUpperCase(),
            description: description.trim(),
            is_private: isPrivate,
        });
        setMessage("Project settings saved.");
    };

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!project || files.length === 0 || !canManageProject) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                const uploaded = await uploadFile(file);
                await createDocumentMutation.mutateAsync({
                    name: file.name,
                    url: uploaded.url,
                    kind: "file",
                    mime_type: file.type || "application/octet-stream",
                    size_bytes: file.size,
                });
            }
            setMessage(files.length === 1 ? "Document uploaded." : "Documents uploaded.");
        } catch (error) {
            console.error("Failed to upload document:", error);
            toast.error("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleAttachLink = async (event: FormEvent) => {
        event.preventDefault();
        if (!project || !canManageProject) return;

        const trimmedUrl = linkUrl.trim();
        const trimmedName = linkName.trim();
        try {
            await createDocumentMutation.mutateAsync({
                name: trimmedName || new URL(trimmedUrl).hostname.replace(/^www\./, ""),
                url: trimmedUrl,
                kind: "link",
            });
            setLinkName("");
            setLinkUrl("");
            setMessage("Link attached.");
        } catch (error) {
            console.error("Failed to attach link:", error);
            toast.error("Couldn't attach the link. Please try again.");
        }
    };

    const resetMeetingNoteForm = () => {
        setEditingMeetingNote(null);
        setMeetingAt(nowDatetimeLocalValue());
        setMeetingContent("");
    };

    const handleEditMeetingNote = (note: ProjectMeetingNote) => {
        setEditingMeetingNote(note);
        setMeetingAt(toDatetimeLocalValue(note.meeting_at));
        setMeetingContent(note.content);
    };

    const handleSubmitMeetingNote = async (event: FormEvent) => {
        event.preventDefault();
        if (!project || !canManageMeetingNotes) return;

        const trimmedContent = meetingContent.trim();
        if (!meetingAt || !trimmedContent) return;

        const payload = {
            meeting_at: datetimeLocalToISOString(meetingAt),
            content: trimmedContent,
        };

        if (editingMeetingNote) {
            await updateMeetingNoteMutation.mutateAsync({ noteId: editingMeetingNote.id, payload });
            setMessage("Meeting note updated.");
        } else {
            await createMeetingNoteMutation.mutateAsync(payload);
            setMessage("Meeting note added.");
        }

        resetMeetingNoteForm();
    };

    const handleDeleteMeetingNote = async (noteId: string) => {
        await deleteMeetingNoteMutation.mutateAsync(noteId);
        if (editingMeetingNote?.id === noteId) {
            resetMeetingNoteForm();
        }
        setMessage("Meeting note deleted.");
    };

    const handleDownloadWeeklySummary = (summary: WeeklyProjectSummary) => {
        downloadWeeklySummaryMutation.mutate(summary.id, {
            onSuccess: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${project?.slug || "project"}-weekly-summary-${summary.period_start.slice(0, 10)}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            },
            onError: () => {
                setMessage("Couldn't download weekly summary PDF.");
            },
        });
    };

    const handleGenerateWeeklySummary = () => {
        generateWeeklySummaryMutation.mutate(undefined, {
            onSuccess: () => {
                setMessage("Weekly summary generated.");
            },
            onError: () => {
                setMessage("Couldn't generate weekly summary.");
            },
        });
    };

    if (isProjectLoading) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Loading project settings…</div>;
    }

    if (isProjectError || !project) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Project not found.</div>;
    }

    return (
        <div className="max-w-6xl space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-[13px] font-semibold text-slate-500 shadow-sm">
                    <Link href={`/${teamSlug}`} className="transition-colors hover:text-slate-900">Projects</Link>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <Link href={`/${teamSlug}/${projectSlug}`} className="max-w-[11rem] truncate transition-colors hover:text-slate-900 sm:max-w-xs">
                        {project.name}
                    </Link>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="text-slate-900">Settings</span>
                </div>
                <Link
                    href={`/${teamSlug}/${projectSlug}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/5 bg-white/78 px-4 text-sm font-semibold text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,box-shadow,background-color,border-color,color] hover:bg-white active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                </Link>
            </div>

            <section className="rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.25)] backdrop-blur-2xl sm:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Project Settings</p>
                        <h1 className="truncate text-[32px] font-semibold tracking-tight text-slate-950 md:text-[40px]">
                            {project.name}
                        </h1>
                        <p className="max-w-2xl text-[15px] leading-relaxed text-slate-500">
                            Manage the project identity, visibility, shared documents, meeting notes, and weekly progress reports.
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-3 md:w-[36rem] md:grid-cols-4">
                        {([
                            ["Tasks", project.task_count || 0],
                            ["Documents", documents.length],
                            ["Notes", meetingNotes.length],
                            ["Weekly", weeklySummaries.length],
                        ] as const).map(([label, value]) => (
                            <div key={label} className="rounded-[1.15rem] border border-black/5 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {message ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {message}
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
                <aside className="lg:sticky lg:top-24">
                    <nav
                        className="flex snap-x gap-2 overflow-x-auto rounded-[1.4rem] border border-white/70 bg-white/80 p-2 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.38)] backdrop-blur-2xl lg:flex-col lg:overflow-visible"
                        aria-label="Project settings sections"
                    >
                        {([
                            ["details", "Details", Globe2, "Identity and visibility"],
                            ["documents", "Documents", Paperclip, `${documents.length} shared item${documents.length === 1 ? "" : "s"}`],
                            ["meeting-notes", "Meeting Notes", CalendarClock, `${meetingNotes.length} note${meetingNotes.length === 1 ? "" : "s"}`],
                            ["weekly-summary", "Weekly Summary", FileText, `${weeklySummaries.length} report${weeklySummaries.length === 1 ? "" : "s"}`],
                            ["public-share", "Public Share", LinkIcon, "Read-only client link"],
                        ] as const).map(([tab, label, Icon, description]) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex min-w-[11rem] snap-start items-center gap-3 rounded-[1.05rem] px-3 py-3 text-left transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 lg:min-w-0",
                                    activeTab === tab
                                        ? "bg-primary-dark text-white shadow-[0_18px_36px_-28px_rgba(51,35,127,0.62)]"
                                        : "text-slate-600 hover:bg-white hover:text-slate-950",
                                )}
                                aria-current={activeTab === tab ? "page" : undefined}
                            >
                                <span className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                                    activeTab === tab ? "border-white/15 bg-white/10 text-white" : "border-black/5 bg-slate-50 text-primary",
                                )}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className={cn("hidden truncate text-xs leading-5 lg:block", activeTab === tab ? "text-white/60" : "text-slate-500")}>
                                        {description}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="min-w-0">
                    {activeTab === "details" ? (
                        <SettingsSection
                            eyebrow="General"
                            title="Project Details"
                            description="Update the project information shown across the workspace. The URL slug is kept stable for now."
                            action={
                                <Button type="submit" form="project-settings-form" disabled={!canManageProject || !isDirty || updateProjectMutation.isPending}>
                                    {updateProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                                    Save
                                </Button>
                            }
                        >
                            <form id="project-settings-form" onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
                                <SettingsField label="Project Name">
                                    <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canManageProject} required />
                                </SettingsField>
                                <SettingsField label="Project Key">
                                    <Input
                                        value={key}
                                        onChange={(event) => setKey(event.target.value.toUpperCase().slice(0, 4))}
                                        disabled={!canManageProject}
                                        maxLength={4}
                                        required
                                    />
                                </SettingsField>
                                <SettingsField label="Description" className="md:col-span-2">
                                    <Textarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        disabled={!canManageProject}
                                        rows={5}
                                        className="resize-none"
                                        placeholder="What is this project trying to accomplish?"
                                    />
                                </SettingsField>
                                <div
                                    role="switch"
                                    aria-checked={isPrivate}
                                    aria-disabled={!canManageProject}
                                    tabIndex={canManageProject ? 0 : -1}
                                    onClick={() => {
                                        if (canManageProject) {
                                            setIsPrivate((current) => !current);
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (!canManageProject || (event.key !== "Enter" && event.key !== " ")) {
                                            return;
                                        }

                                        event.preventDefault();
                                        setIsPrivate((current) => !current);
                                    }}
                                    className="md:col-span-2 w-full cursor-pointer rounded-[1.35rem] border border-black/5 bg-slate-50/70 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-[border-color,background-color,box-shadow] hover:border-slate-200 hover:bg-white aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span>
                                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                <Lock className="h-4 w-4" aria-hidden="true" />
                                                Private project
                                            </span>
                                            <span className="mt-1 block text-sm leading-6 text-slate-500">
                                                Restrict access to explicit project members and workspace roles that can view all projects.
                                            </span>
                                        </span>
                                        <ToggleSwitch checked={isPrivate} disabled={!canManageProject} interactive={false} />
                                    </div>
                                </div>
                            </form>
                        </SettingsSection>
                    ) : activeTab === "documents" ? (
                        <SettingsSection
                            eyebrow="Documents"
                            title="Project Documents"
                            description="Attach files and external links that belong to the whole project, not only to one task."
                            action={
                                canManageProject ? (
                                    <>
                                        <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
                                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                                            Upload
                                        </Button>
                                    </>
                                ) : null
                            }
                        >
                            {canManageProject ? (
                                <form onSubmit={handleAttachLink} className="mb-6 grid gap-3 rounded-[1.35rem] border border-black/5 bg-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_auto] md:items-end">
                                    <SettingsField label="Link Name">
                                        <Input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Product brief" />
                                    </SettingsField>
                                    <SettingsField label="Document URL">
                                        <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://docs.google.com/…" type="url" required />
                                    </SettingsField>
                                    <Button type="submit" disabled={createDocumentMutation.isPending || !linkUrl.trim()}>
                                        {createDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LinkIcon className="h-4 w-4" aria-hidden="true" />}
                                        {createDocumentMutation.isPending ? "Attaching…" : "Attach"}
                                    </Button>
                                </form>
                            ) : null}

                            {isDocumentsLoading ? (
                                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    Loading documents…
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="grid gap-3">
                                    {documents.map((document) => {
                                        const fileInfo = getFileIcon(document);
                                        const Icon = fileInfo.icon;

                                        return (
                                            <div key={document.id} className="flex items-center gap-3 rounded-[1.25rem] border border-black/5 bg-white/82 p-3 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.38)]">
                                                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem]", fileInfo.color)}>
                                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-slate-950">{document.name}</p>
                                                    <p className="mt-1 truncate text-xs text-slate-500">
                                                        {document.kind === "file" ? formatBytes(document.size_bytes) : document.url}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={document.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:min-h-0 md:min-w-0"
                                                        aria-label={`Open ${document.name}`}
                                                    >
                                                        {document.kind === "file" ? <Download className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                                                    </a>
                                                    {canManageProject ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteDocumentMutation.mutate(document.id)}
                                                            className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-fg)] md:min-h-0 md:min-w-0"
                                                            aria-label={`Delete ${document.name}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    size="compact"
                                    icon={<Paperclip className="h-5 w-5 text-slate-400" aria-hidden="true" />}
                                    title="No project documents yet"
                                    description="Upload a file or attach a link when this project needs shared references."
                                />
                            )}
                        </SettingsSection>
                    ) : activeTab === "weekly-summary" ? (
                        <SettingsSection
                            eyebrow="Weekly"
                            title="Weekly Summary"
                            description="Generated every Monday at 08:00 WIB for the previous work week."
                            action={
                                canManageProject ? (
                                    <Button
                                        type="button"
                                        onClick={handleGenerateWeeklySummary}
                                        disabled={generateWeeklySummaryMutation.isPending}
                                    >
                                        {generateWeeklySummaryMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        Generate
                                    </Button>
                                ) : null
                            }
                        >
                            {isWeeklySummariesLoading ? (
                                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    Loading weekly summaries...
                                </div>
                            ) : weeklySummaries.length > 0 ? (
                                <div className="grid gap-4">
                                    {weeklySummaries.map((summary) => {
                                        const content = summary.summary_json || { executive_summary: "" };
                                        const teamContributions = summaryItems(content.team_contributions);
                                        const completed = summaryItems(content.completed_work);
                                        const inProgress = summaryItems(content.in_progress_work);
                                        const risks = summaryItems(content.risks_blockers);
                                        const nextSteps = summaryItems(content.next_steps);
                                        const isCompleted = summary.status === "COMPLETED";

                                        return (
                                            <article key={summary.id} className={cn("rounded-[1.25rem] border bg-white/82 p-4 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.38)]", isCompleted ? "border-emerald-100" : summary.status === "FAILED" ? "border-[var(--danger-border)]" : "border-amber-100")}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                                                            <h3 className="text-sm font-semibold text-slate-950">{formatSummaryPeriod(summary)}</h3>
                                                            <span className={cn(
                                                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
                                                                statusTone(summary.status),
                                                            )}>
                                                                {summary.status.toLowerCase()}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Generated {summary.generated_at ? formatMeetingDate(summary.generated_at) : "pending"}
                                                            {summary.emailed_at ? ` · Emailed ${formatMeetingDate(summary.emailed_at)}` : ""}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => handleDownloadWeeklySummary(summary)}
                                                        disabled={!isCompleted || downloadWeeklySummaryMutation.isPending}
                                                    >
                                                        {downloadWeeklySummaryMutation.isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                        ) : (
                                                            <Download className="h-4 w-4" aria-hidden="true" />
                                                        )}
                                                        PDF
                                                    </Button>
                                                </div>

                                                {summary.status === "FAILED" ? (
                                                    <p className="mt-4 rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                                                        {summary.error_message || "Weekly summary generation failed."}
                                                    </p>
                                                ) : (
                                                    <>
                                                        <p className="mt-4 text-sm leading-6 text-slate-700">{content.executive_summary || summary.summary_text}</p>
                                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                            {([
                                                                ["Team", teamContributions],
                                                                ["Completed", completed],
                                                                ["In Progress", inProgress],
                                                                ["Risks", risks],
                                                                ["Next Steps", nextSteps],
                                                            ] as const).map(([label, items]) => (
                                                                <section key={label} className="rounded-[1rem] border border-black/5 bg-slate-50/70 p-3">
                                                                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</h4>
                                                                    {items.length > 0 ? (
                                                                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
                                                                            {items.slice(0, 4).map((item, index) => (
                                                                                <li key={`${label}-${index}`} className="flex gap-2">
                                                                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                                                                                    <span>{item}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="mt-2 text-sm text-slate-500">No items.</p>
                                                                    )}
                                                                </section>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    size="compact"
                                    icon={<FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />}
                                    title="No weekly summaries yet"
                                    description="The first report appears after the Monday 08:00 WIB scheduler creates it."
                                />
                            )}
                        </SettingsSection>
                    ) : activeTab === "public-share" ? (
                        <ProjectShareSettings projectId={projectId} canManage={canManageProject} />
                    ) : (
                        <SettingsSection
                            eyebrow="Meeting Notes"
                            title="Meeting Notes"
                            description="Capture dated meeting notes for this project as plain text."
                            action={
                                editingMeetingNote ? (
                                    <Button type="button" variant="secondary" onClick={resetMeetingNoteForm}>
                                        <X className="h-4 w-4" aria-hidden="true" />
                                        Cancel
                                    </Button>
                                ) : null
                            }
                        >
                            <form onSubmit={handleSubmitMeetingNote} className="mb-6 grid gap-4 rounded-[1.35rem] border border-black/5 bg-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                                    <SettingsField label="Meeting Date & Time">
                                        <Input
                                            type="datetime-local"
                                            value={meetingAt}
                                            onChange={(event) => setMeetingAt(event.target.value)}
                                            required
                                        />
                                    </SettingsField>
                                    <SettingsField label="Notes">
                                        <Textarea
                                            value={meetingContent}
                                            onChange={(event) => setMeetingContent(event.target.value)}
                                            rows={4}
                                            required
                                            placeholder="Write the meeting notes..."
                                        />
                                    </SettingsField>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    {editingMeetingNote ? (
                                        <Button type="button" variant="secondary" onClick={resetMeetingNoteForm}>
                                            <X className="h-4 w-4" aria-hidden="true" />
                                            Cancel
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="submit"
                                        disabled={
                                            !canManageMeetingNotes ||
                                            !meetingAt ||
                                            !meetingContent.trim() ||
                                            createMeetingNoteMutation.isPending ||
                                            updateMeetingNoteMutation.isPending
                                        }
                                    >
                                        {(createMeetingNoteMutation.isPending || updateMeetingNoteMutation.isPending) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Save className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        {editingMeetingNote ? "Update" : "Add Note"}
                                    </Button>
                                </div>
                            </form>

                            {isMeetingNotesLoading ? (
                                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    Loading meeting notes...
                                </div>
                            ) : meetingNotes.length > 0 ? (
                                <div className="grid gap-3">
                                    {meetingNotes.map((note) => (
                                        <article key={note.id} className="rounded-[1.25rem] border border-black/5 bg-white/82 p-4 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.38)]">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                        <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                                                        <time dateTime={note.meeting_at}>{formatMeetingDate(note.meeting_at)}</time>
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Last updated by {note.updated_by?.name || note.created_by?.name || "team member"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditMeetingNote(note)}
                                                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:min-h-0 md:min-w-0"
                                                        aria-label={`Edit meeting note from ${formatMeetingDate(note.meeting_at)}`}
                                                    >
                                                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMeetingNote(note.id)}
                                                        disabled={deleteMeetingNoteMutation.isPending}
                                                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-fg)] md:min-h-0 md:min-w-0"
                                                        aria-label={`Delete meeting note from ${formatMeetingDate(note.meeting_at)}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.content}</p>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    size="compact"
                                    icon={<CalendarClock className="h-5 w-5 text-slate-400" aria-hidden="true" />}
                                    title="No meeting notes yet"
                                    description="Add a meeting date and notes when this project has a discussion worth keeping."
                                />
                            )}
                        </SettingsSection>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProjectSettingsPage({ params }: { params: Promise<{ teamSlug: string; projectSlug: string }> }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <ProjectSettingsPageContent params={params} />
        </Suspense>
    );
}
