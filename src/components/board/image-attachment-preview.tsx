"use client";

import Image from "@/components/app-image";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    ImageOff,
    Loader2,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";

type ImageAttachmentPreviewProps = {
    /** Image attachment URLs the gallery can move between. */
    images: string[];
    /** Index (within `images`) to open on. */
    startIndex: number;
    onClose: () => void;
    /** Reuses the modal's filename cleaner so labels stay consistent. */
    getDisplayName: (url: string) => string;
};

type LoadStatus = "loading" | "loaded" | "error";

const MIN_ZOOM = 1.5;
const MAX_ZOOM = 4;
const DRAG_THRESHOLD = 4;

const controlClass =
    "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-30";

function fileFormat(name: string) {
    const dot = name.lastIndexOf(".");
    if (dot === -1 || dot === name.length - 1) return "Image";
    return name.slice(dot + 1).toUpperCase();
}

export function ImageAttachmentPreview({
    images,
    startIndex,
    onClose,
    getDisplayName,
}: ImageAttachmentPreviewProps) {
    const [current, setCurrent] = useState(() =>
        Math.min(Math.max(startIndex, 0), Math.max(images.length - 1, 0)),
    );
    const [status, setStatus] = useState<LoadStatus>("loading");
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    const [zoomed, setZoomed] = useState(false);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDownloading, setIsDownloading] = useState(false);

    const stageRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const drag = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });
    const triggerRef = useRef<HTMLElement | null>(null);

    const safeIndex = Math.min(current, Math.max(images.length - 1, 0));
    const url = images[safeIndex];
    const name = url ? getDisplayName(url) : "Image";
    const hasMultiple = images.length > 1;

    // Esc closes the lightbox first (escape stack puts this above the task modal).
    useEscapeKey(true, onClose);

    // If the underlying attachment list empties out, there's nothing to show.
    useEffect(() => {
        if (images.length === 0) onClose();
    }, [images.length, onClose]);

    // Restore focus to the thumbnail that opened the preview on unmount.
    useEffect(() => {
        triggerRef.current = (document.activeElement as HTMLElement) ?? null;
        return () => triggerRef.current?.focus?.();
    }, []);

    // Each image starts fresh: fit view, no pan. A cached image reports
    // `complete` synchronously and never fires onLoad, so detect that here
    // rather than stranding it on the loading spinner.
    useEffect(() => {
        const img = imgRef.current;
        const ready = !!img && img.complete && img.naturalWidth > 0;
        setStatus(ready ? "loaded" : "loading");
        setNatural(ready ? { w: img.naturalWidth, h: img.naturalHeight } : null);
        setZoomed(false);
        setScale(1);
        setPan({ x: 0, y: 0 });
    }, [safeIndex]);

    const clampPan = useCallback((next: { x: number; y: number }, activeScale: number) => {
        const stage = stageRef.current;
        const img = imgRef.current;
        if (!stage || !img) return next;
        const overflowX = Math.max(0, (img.clientWidth * activeScale - stage.clientWidth) / 2);
        const overflowY = Math.max(0, (img.clientHeight * activeScale - stage.clientHeight) / 2);
        return {
            x: Math.min(overflowX, Math.max(-overflowX, next.x)),
            y: Math.min(overflowY, Math.max(-overflowY, next.y)),
        };
    }, []);

    const enterZoom = useCallback(() => {
        const img = imgRef.current;
        if (!img || status !== "loaded") return;
        const fitted = img.clientWidth;
        const intrinsic = img.naturalWidth || fitted;
        const exact = fitted > 0 ? intrinsic / fitted : MIN_ZOOM;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, exact));
        setScale(next);
        setPan({ x: 0, y: 0 });
        setZoomed(true);
    }, [status]);

    const exitZoom = useCallback(() => {
        setZoomed(false);
        setScale(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const toggleZoom = useCallback(() => {
        if (zoomed) exitZoom();
        else enterZoom();
    }, [zoomed, enterZoom, exitZoom]);

    const goPrev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
    const goNext = useCallback(
        () => setCurrent((c) => Math.min(images.length - 1, c + 1)),
        [images.length],
    );

    // Keyboard: arrows navigate, +/- zoom.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowLeft":
                    if (hasMultiple) {
                        event.preventDefault();
                        goPrev();
                    }
                    break;
                case "ArrowRight":
                    if (hasMultiple) {
                        event.preventDefault();
                        goNext();
                    }
                    break;
                case "+":
                case "=":
                    event.preventDefault();
                    if (!zoomed) enterZoom();
                    break;
                case "-":
                    event.preventDefault();
                    if (zoomed) exitZoom();
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hasMultiple, zoomed, goPrev, goNext, enterZoom, exitZoom]);

    // Focus the overlay so the dialog is announced and Tab is trapped inside.
    useEffect(() => {
        overlayRef.current?.focus();
    }, []);

    const trapTab = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") return;
        const root = overlayRef.current;
        if (!root) return;
        const focusables = Array.from(
            root.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            ),
        ).filter((el) => el.offsetParent !== null || el === root);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }, []);

    const handlePointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
        if (status !== "loaded") return;
        drag.current = {
            active: true,
            startX: event.clientX,
            startY: event.clientY,
            baseX: pan.x,
            baseY: pan.y,
            moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
        if (!drag.current.active) return;
        const dx = event.clientX - drag.current.startX;
        const dy = event.clientY - drag.current.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            drag.current.moved = true;
        }
        if (zoomed) {
            setPan(clampPan({ x: drag.current.baseX + dx, y: drag.current.baseY + dy }, scale));
        }
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLImageElement>) => {
        if (!drag.current.active) return;
        const moved = drag.current.moved;
        drag.current.active = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (!moved) toggleZoom();
    };

    const handleDownload = async () => {
        if (!url || isDownloading) return;
        setIsDownloading(true);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`status ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            // Cross-origin R2 may block fetch; fall back to opening the original.
            window.open(url, "_blank", "noopener,noreferrer");
        } finally {
            setIsDownloading(false);
        }
    };

    const closeIfBackdrop = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose();
    };

    const caption = natural
        ? `${fileFormat(name)} · ${natural.w} × ${natural.h}`
        : fileFormat(name);

    return (
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Image preview: ${name}`}
            tabIndex={-1}
            onKeyDown={trapTab}
            onClick={closeIfBackdrop}
            className="lightbox-scrim fixed inset-0 z-[70] flex flex-col bg-slate-950/80 outline-none backdrop-blur-md"
        >
            {/* Toolbar */}
            <div
                className="flex items-start justify-between gap-3 px-3 py-3 md:px-5"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="min-w-0 flex-1 pt-1.5">
                    <p className="truncate text-sm font-semibold text-white" title={name}>
                        {name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/60">{caption}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={toggleZoom}
                        disabled={status !== "loaded"}
                        aria-pressed={zoomed}
                        aria-label={zoomed ? "Fit image to screen" : "Zoom in"}
                        className={controlClass}
                    >
                        {zoomed ? (
                            <ZoomOut className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                        ) : (
                            <ZoomIn className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        aria-label={`Download ${name}`}
                        className={controlClass}
                    >
                        {isDownloading ? (
                            <Loader2 className="h-[1.15rem] w-[1.15rem] animate-spin" aria-hidden="true" />
                        ) : (
                            <Download className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                        )}
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${name} in a new tab`}
                        className={controlClass}
                    >
                        <ExternalLink className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        className={cn(controlClass, "hover:bg-white/20")}
                    >
                        <X className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Stage */}
            <div
                ref={stageRef}
                onClick={closeIfBackdrop}
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-14 pt-1 md:px-20"
            >
                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            goPrev();
                        }}
                        disabled={safeIndex === 0}
                        aria-label="Previous image"
                        className={cn(
                            controlClass,
                            "absolute left-1.5 top-1/2 z-10 -translate-y-1/2 bg-white/10 backdrop-blur hover:bg-white/20 md:left-3",
                        )}
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}

                {status === "error" ? (
                    <div className="flex flex-col items-center gap-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <ImageOff className="h-9 w-9 text-white/50" aria-hidden="true" />
                        <p className="text-sm text-white/80">Couldn&apos;t load this image.</p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            Open original
                        </a>
                    </div>
                ) : (
                    <>
                        {status === "loading" && (
                            <Loader2
                                className="pointer-events-none absolute h-8 w-8 animate-spin text-white/60"
                                aria-hidden="true"
                            />
                        )}
                        <Image
                            key={url}
                            ref={imgRef}
                            src={url}
                            alt={name}
                            loading="eager"
                            draggable={false}
                            onLoad={(event) => {
                                setNatural({
                                    w: event.currentTarget.naturalWidth,
                                    h: event.currentTarget.naturalHeight,
                                });
                                setStatus("loaded");
                            }}
                            onError={() => setStatus("error")}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            className={cn(
                                "lightbox-figure max-h-full max-w-full select-none object-contain shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
                                status !== "loaded" && "opacity-0",
                                zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
                            )}
                            style={{
                                width: "auto",
                                height: "auto",
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                                ...(drag.current.active ? { transition: "none" } : {}),
                            }}
                        />
                    </>
                )}

                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            goNext();
                        }}
                        disabled={safeIndex === images.length - 1}
                        aria-label="Next image"
                        className={cn(
                            controlClass,
                            "absolute right-1.5 top-1/2 z-10 -translate-y-1/2 bg-white/10 backdrop-blur hover:bg-white/20 md:right-3",
                        )}
                    >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}

                {hasMultiple && (
                    <p
                        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white/80 backdrop-blur"
                        aria-live="polite"
                    >
                        {safeIndex + 1} / {images.length}
                    </p>
                )}
            </div>
        </div>
    );
}
