"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
    ArrowLeft,
    Download,
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
    Save,
    Sheet,
    Trash2,
    Upload,
} from "lucide-react";
import Link from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsField } from "@/components/ui/settings-field";
import { SettingsSection } from "@/components/ui/settings-section";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useProjectBySlugs, useProjectDocuments, useUpdateProject, useCreateProjectDocument, useDeleteProjectDocument } from "@/lib/hooks/use-project";
import { useTeam } from "@/lib/hooks/use-team";
import { uploadFile } from "@/lib/api";
import { ProjectDocument } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type ProjectSettingsTab = "details" | "documents";

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

function ProjectSettingsPageContent({ params }: { params: Promise<{ teamSlug: string; projectSlug: string }> }) {
    const { teamSlug, projectSlug } = use(params);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = useStore((state) => state.user);

    const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProjectBySlugs(teamSlug, projectSlug);
    const { data: team } = useTeam(teamSlug);
    const projectId = project?.id || "";
    const { data: documents = [], isLoading: isDocumentsLoading } = useProjectDocuments(projectId);
    const updateProjectMutation = useUpdateProject(projectId);
    const createDocumentMutation = useCreateProjectDocument(projectId);
    const deleteDocumentMutation = useDeleteProjectDocument(projectId);

    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [linkName, setLinkName] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
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

    const canManageProject = useMemo(() => {
        if (!team || !currentUser) return false;
        return team.owner_id === currentUser.id || ["OWNER", "ADMIN"].includes((team.role || "").toUpperCase());
    }, [currentUser, team]);

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
        await createDocumentMutation.mutateAsync({
            name: trimmedName || new URL(trimmedUrl).hostname.replace(/^www\./, ""),
            url: trimmedUrl,
            kind: "link",
        });
        setLinkName("");
        setLinkUrl("");
        setMessage("Link attached.");
    };

    if (isProjectLoading) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Loading project settings…</div>;
    }

    if (isProjectError || !project) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Project not found.</div>;
    }

    return (
        <div className="space-y-7 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={`/${teamSlug}`} className="transition hover:text-foreground">Projects</Link>
                    <span>/</span>
                    <Link href={`/${teamSlug}/${projectSlug}`} className="transition hover:text-foreground">{project.name}</Link>
                    <span>/</span>
                    <span className="font-medium text-foreground">Settings</span>
                </div>
                <Link
                    href={`/${teamSlug}/${projectSlug}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/5 bg-white/78 px-4 text-sm font-semibold text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,box-shadow,background-color,border-color,color] hover:bg-white active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                </Link>
            </div>

            <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fc_100%)] p-6 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] md:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                            <Globe2 className="h-3.5 w-3.5 text-slate-900" aria-hidden="true" />
                            Project Control Center
                        </div>
                        <h1 className="mt-5 max-w-3xl text-balance font-space-grotesk text-[32px] font-semibold tracking-tight text-slate-950 md:text-[40px]">
                            {project.name}
                        </h1>
                        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">
                            Keep project identity, visibility, and shared documents in one focused place without crowding the kanban board.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tasks</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">{project.task_count || 0}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Documents</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">{documents.length}</p>
                        </div>
                    </div>
                </div>
            </section>

            {message ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {message}
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
                <aside className="rounded-[1.75rem] border border-white/70 bg-white/78 p-2 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                    <nav className="grid gap-1" aria-label="Project settings sections">
                        {([
                            ["details", "Details", Globe2, "Identity and visibility"],
                            ["documents", "Documents", Paperclip, `${documents.length} shared item${documents.length === 1 ? "" : "s"}`],
                        ] as const).map(([tab, label, Icon, description]) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex min-h-14 w-full items-center gap-3 rounded-[1.25rem] px-3.5 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15",
                                    activeTab === tab
                                        ? "border border-black/5 bg-white text-slate-950 shadow-sm"
                                        : "border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900",
                                )}
                            >
                                <span className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                    activeTab === tab ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500",
                                )}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className="block truncate text-xs text-slate-500">{description}</span>
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
                                    <textarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        disabled={!canManageProject}
                                        rows={5}
                                        className="w-full resize-none rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                                    className="md:col-span-2 w-full cursor-pointer rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.4)] transition-[border-color,background-color,box-shadow] hover:border-slate-200 hover:bg-white aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
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
                    ) : (
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
                                <form onSubmit={handleAttachLink} className="mb-6 grid gap-3 rounded-[1.35rem] border border-black/5 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_auto] md:items-end">
                                    <SettingsField label="Link Name">
                                        <Input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Product brief" />
                                    </SettingsField>
                                    <SettingsField label="Document URL">
                                        <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://docs.google.com/…" type="url" required />
                                    </SettingsField>
                                    <Button type="submit" disabled={createDocumentMutation.isPending || !linkUrl.trim()}>
                                        <LinkIcon className="h-4 w-4" aria-hidden="true" />
                                        Attach
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
                                            <div key={document.id} className="flex items-center gap-3 rounded-[1.25rem] border border-black/5 bg-white/82 p-3 shadow-sm">
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
                                                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                                        aria-label={`Open ${document.name}`}
                                                    >
                                                        {document.kind === "file" ? <Download className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                                                    </a>
                                                    {canManageProject ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteDocumentMutation.mutate(document.id)}
                                                            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-fg)]"
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
                                <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                    <Paperclip className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                                    <p className="mt-3 text-sm font-semibold text-slate-900">No project documents yet</p>
                                    <p className="mt-1 text-sm text-slate-500">Upload a file or attach a link when this project needs shared references.</p>
                                </div>
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
