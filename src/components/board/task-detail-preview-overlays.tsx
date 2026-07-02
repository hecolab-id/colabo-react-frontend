"use client";

import { ExternalLink, X } from "lucide-react";
import { ImageAttachmentPreview } from "./image-attachment-preview";
import { getFileName, getPdfPreviewUrl, type PdfPreview } from "./task-detail-attachments";

interface TaskDetailPreviewOverlaysProps {
    activePdfPreview: PdfPreview | null;
    imageAttachments: string[];
    imagePreviewIndex: number | null;
    onCloseImagePreview: () => void;
    onClosePdfPreview: () => void;
}

export function TaskDetailPreviewOverlays({
    activePdfPreview,
    imageAttachments,
    imagePreviewIndex,
    onCloseImagePreview,
    onClosePdfPreview,
}: TaskDetailPreviewOverlaysProps) {
    return (
        <>
            {activePdfPreview ? (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/56 p-3 backdrop-blur-md md:p-6"
                    onClick={(event) => {
                        event.stopPropagation();
                        onClosePdfPreview();
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
                                    onClick={onClosePdfPreview}
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

            {imagePreviewIndex !== null && imageAttachments.length > 0 ? (
                <ImageAttachmentPreview
                    images={imageAttachments}
                    startIndex={imagePreviewIndex}
                    getDisplayName={getFileName}
                    onClose={onCloseImagePreview}
                />
            ) : null}
        </>
    );
}
