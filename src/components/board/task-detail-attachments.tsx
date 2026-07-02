"use client";

import Image from "@/components/app-image";
import type { ChangeEvent, RefObject } from "react";
import {
    ExternalLink,
    Eye,
    File as FileIconBase,
    FileCode,
    FileText,
    Loader2,
    Maximize2,
    Paperclip,
    Presentation,
    Sheet,
    Trash2,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, SectionCard } from "./task-detail-modal-parts";

export type PdfPreview = { url: string; name: string };

interface AttachmentSectionProps {
    attachments: string[];
    anchorRef: RefObject<HTMLSpanElement | null>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    lastUpdatedAt?: string;
    isUploading: boolean;
    showAllAttachments: boolean;
    recentlyReplaced: string[];
    recentlyAdded: string[];
    removingAttachmentUrl: string | null;
    onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    onOpenImagePreview: (url: string) => void;
    onOpenPdfPreview: (preview: PdfPreview) => void;
    onRemoveAttachment: (url: string) => void;
    onToggleShowAllAttachments: () => void;
}

export function AttachmentSection({
    attachments,
    anchorRef,
    fileInputRef,
    lastUpdatedAt,
    isUploading,
    showAllAttachments,
    recentlyReplaced,
    recentlyAdded,
    removingAttachmentUrl,
    onFileUpload,
    onOpenImagePreview,
    onOpenPdfPreview,
    onRemoveAttachment,
    onToggleShowAllAttachments,
}: AttachmentSectionProps) {
    const visibleAttachments = showAllAttachments ? attachments : attachments.slice(0, 3);

    return (
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
                        onChange={onFileUpload}
                        className="hidden"
                        aria-label="Upload attachments"
                    />
                </>
            }
        >
            <span ref={anchorRef} className="block h-0" aria-hidden="true" />
            {attachments.length > 0 ? (
                <div className="space-y-3">
                    {visibleAttachments.map((url, index) => {
                        const isImage = isImageFile(url);
                        const isPdf = isPdfFile(url);
                        const fileInfo = getFileIcon(url);
                        const FileIcon = fileInfo.icon;
                        const fileName = getFileName(url);
                        const fileMeta = getFileMeta(url, lastUpdatedAt);
                        const isReplaced = recentlyReplaced.includes(fileName.toLowerCase());
                        const isJustAdded = recentlyAdded.includes(url);

                        return (
                            <div
                                key={`${url}-${index}`}
                                className={cn(
                                    "flex items-center gap-3 border-b border-border/70 py-2 transition-colors last:border-b-0 hover:bg-muted/25",
                                    (isReplaced || isJustAdded) && "attachment-replaced-flash",
                                )}
                            >
                                {isImage ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenImagePreview(url)}
                                        aria-label={`Preview ${fileName}`}
                                        className="group relative h-10 w-10 shrink-0 cursor-zoom-in overflow-hidden rounded-[0.8rem] border border-border bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                    >
                                        <Image
                                            src={url}
                                            alt={fileName}
                                            fill
                                            sizes="40px"
                                            className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.06]"
                                        />
                                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-slate-950/35 group-hover:opacity-100 group-focus-visible:bg-slate-950/35 group-focus-visible:opacity-100">
                                            <Maximize2 className="h-4 w-4 text-white" aria-hidden="true" />
                                        </span>
                                    </button>
                                ) : (
                                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem]", fileInfo.color)}>
                                        <FileIcon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{fileMeta}</p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {isPdf ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenPdfPreview({ url, name: fileName })}
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
                                        onClick={() => onRemoveAttachment(url)}
                                        disabled={removingAttachmentUrl !== null}
                                        aria-label={`Remove ${fileName}`}
                                        title="Remove attachment"
                                        className="touch-manipulation rounded-full p-2 text-slate-500 transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--danger-fg)]/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {removingAttachmentUrl === url ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {attachments.length > 3 && (
                        <button
                            type="button"
                            onClick={onToggleShowAllAttachments}
                            className="touch-manipulation text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                            {showAllAttachments ? "Show fewer" : `Show ${attachments.length - 3} more attachment${attachments.length - 3 === 1 ? "" : "s"}`}
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
    );
}

function getAttachmentPath(url: string) {
    try {
        return new URL(url, window.location.origin).pathname.toLowerCase();
    } catch {
        return url.split("?")[0].split("#")[0].toLowerCase();
    }
}

export function getFileName(url: string) {
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
}

export function isImageFile(url: string) {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
    const path = getAttachmentPath(url);
    return imageExtensions.some((extension) => path.endsWith(extension));
}

export function getPdfPreviewUrl(url: string) {
    return `${url.split("#")[0]}#toolbar=1&navpanes=0&view=FitH`;
}

function isPdfFile(url: string) {
    return getAttachmentPath(url).endsWith(".pdf");
}

function getFileMeta(url: string, lastUpdatedAt?: string) {
    const path = getAttachmentPath(url);
    const extension = path.match(/\.[a-z0-9]+$/i)?.[0]?.slice(1).toUpperCase() || "";

    let type = "File";
    if (isImageFile(url)) {
        type = extension || "Image";
    } else if (isPdfFile(url)) {
        type = "PDF";
    } else if (/\.(doc|docx|txt|rtf)$/i.test(path)) {
        type = "Document";
    } else if (/\.(xls|xlsx|csv)$/i.test(path)) {
        type = "Spreadsheet";
    } else if (/\.(ppt|pptx)$/i.test(path)) {
        type = "Presentation";
    } else if (/\.(js|jsx|ts|tsx|json|html|css|md)$/i.test(path)) {
        type = "Code";
    }

    const details = extension && extension !== type ? [type, extension] : [type];
    const updatedLabel = formatAttachmentUpdatedAt(lastUpdatedAt);
    if (updatedLabel) details.push(updatedLabel);

    return details.join(" · ");
}

function formatAttachmentUpdatedAt(value?: string) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return `Updated ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date)}`;
}

function getFileIcon(url: string) {
    const fileName = getAttachmentPath(url);

    if (fileName.endsWith(".pdf")) {
        return { icon: FileIconBase, color: "border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]" };
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
}
