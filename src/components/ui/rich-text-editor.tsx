"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Underline as UnderlineIcon, Quote, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { convertImageToWebp } from "@/lib/image-to-webp";

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
    className?: string;
    enableImageUpload?: boolean;
    onImageUpload?: (file: File) => Promise<string>;
    maxImageSizeMb?: number;
    onUploadingChange?: (uploading: boolean) => void;
}

const ACCEPTED_IMAGE = "image/*";

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Write something...",
    editable = true,
    className,
    enableImageUpload = false,
    onImageUpload,
    maxImageSizeMb,
    onUploadingChange,
}: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingCountRef = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const errorTimerRef = useRef<number | null>(null);
    // The editor's paste/drop handlers (captured once at mount) read the live
    // upload fn through this ref; kept in sync by the effect below.
    const uploadRef = useRef<((file: File, pos?: number) => void) | null>(null);

    const canUpload = enableImageUpload && editable && Boolean(onImageUpload);

    const showError = useCallback((message: string) => {
        if (errorTimerRef.current !== null) {
            window.clearTimeout(errorTimerRef.current);
        }
        setUploadError(message);
        errorTimerRef.current = window.setTimeout(() => {
            setUploadError(null);
            errorTimerRef.current = null;
        }, 5000);
    }, []);

    const setPending = useCallback((delta: number) => {
        pendingCountRef.current = Math.max(0, pendingCountRef.current + delta);
        onUploadingChange?.(pendingCountRef.current > 0);
    }, [onUploadingChange]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder }),
            Underline,
            Link.configure({ openOnClick: false }),
            Image.configure({ inline: false, allowBase64: false }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4",
            },
            // editorProps is captured once when the editor mounts, so the
            // handlers read the live upload fn through a ref instead of
            // closing over a stale (mount-time, editor=null) value.
            handlePaste: (_view, event) => {
                if (!uploadRef.current) return false;
                const files = imageFilesFromList(event.clipboardData?.files);
                if (files.length === 0) return false;
                event.preventDefault();
                files.forEach((file) => void uploadRef.current?.(file));
                return true;
            },
            handleDrop: (view, event) => {
                if (!uploadRef.current) return false;
                const files = imageFilesFromList(event.dataTransfer?.files);
                if (files.length === 0) return false;
                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
                files.forEach((file) => void uploadRef.current?.(file, pos));
                return true;
            },
        },
        immediatelyRender: false,
    });

    const uploadAndInsert = useCallback(
        async (file: File, pos?: number) => {
            if (!editor || !onImageUpload) return;

            if (!file.type.startsWith("image/")) {
                showError("Hanya file gambar yang bisa disisipkan.");
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            const insertAt = typeof pos === "number" ? pos : editor.state.selection.from;
            editor
                .chain()
                .insertContentAt(insertAt, { type: "image", attrs: { src: previewUrl } })
                .run();
            setPending(1);

            try {
                const { file: uploadFile } = await convertImageToWebp(file);

                if (typeof maxImageSizeMb === "number" && maxImageSizeMb > 0) {
                    const sizeMb = uploadFile.size / (1024 * 1024);
                    if (sizeMb > maxImageSizeMb) {
                        removeImageBySrc(editor, previewUrl);
                        showError("Gambar gagal diunggah. Ukuran melebihi batas paket Anda.");
                        return;
                    }
                }

                const finalUrl = await onImageUpload(uploadFile);
                swapImageSrc(editor, previewUrl, finalUrl);
            } catch {
                removeImageBySrc(editor, previewUrl);
                showError("Gambar gagal diunggah. Coba lagi.");
            } finally {
                URL.revokeObjectURL(previewUrl);
                setPending(-1);
            }
        },
        [editor, onImageUpload, maxImageSizeMb, showError, setPending],
    );

    // Keep the handler ref pointed at the latest uploadAndInsert. Null when
    // upload is disabled so paste/drop fall through to default behavior.
    useEffect(() => {
        uploadRef.current = canUpload ? uploadAndInsert : null;
    }, [canUpload, uploadAndInsert]);

    // Update content if it changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    useEffect(() => {
        return () => {
            if (errorTimerRef.current !== null) {
                window.clearTimeout(errorTimerRef.current);
            }
        };
    }, []);

    const handleFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = imageFilesFromList(event.target.files);
        files.forEach((file) => void uploadAndInsert(file));
        event.target.value = "";
    };

    if (!editor) {
        return null;
    }

    if (!editable) {
        return <EditorContent editor={editor} className={className} />;
    }

    const ToolbarButton = ({
        onClick,
        isActive = false,
        icon: Icon,
        title,
    }: {
        onClick: () => void;
        isActive?: boolean;
        icon: typeof Bold;
        title: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "p-2 rounded hover:bg-muted transition-colors",
                isActive ? "bg-muted text-primary" : "text-muted-foreground"
            )}
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    return (
        <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/20">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    icon={Bold}
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    icon={Italic}
                    title="Italic"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    icon={UnderlineIcon}
                    title="Underline"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    icon={Strikethrough}
                    title="Strikethrough"
                />
                <div className="w-px h-6 bg-border mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive("heading", { level: 1 })}
                    icon={Heading1}
                    title="Heading 1"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    icon={Heading2}
                    title="Heading 2"
                />
                <div className="w-px h-6 bg-border mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    icon={List}
                    title="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    icon={ListOrdered}
                    title="Ordered List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    icon={Quote}
                    title="Quote"
                />
                {canUpload ? (
                    <>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton
                            onClick={() => fileInputRef.current?.click()}
                            icon={ImagePlus}
                            title="Sisipkan gambar"
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_IMAGE}
                            multiple
                            className="hidden"
                            onChange={handleFilePick}
                        />
                    </>
                ) : null}
            </div>

            {/* Editor */}
            <div
                className={cn(
                    "relative transition-[background-color,box-shadow] duration-150",
                    isDragging && canUpload && "bg-primary/[0.04] shadow-[inset_0_0_0_2px_var(--primary)]",
                )}
                onDragOver={(event) => {
                    if (!canUpload) return;
                    if (Array.from(event.dataTransfer.types).includes("Files")) {
                        event.preventDefault();
                        setIsDragging(true);
                    }
                }}
                onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    setIsDragging(false);
                }}
                onDrop={() => setIsDragging(false)}
            >
                <EditorContent editor={editor} />
            </div>

            {uploadError ? (
                <div role="status" aria-live="polite" className="border-t border-border bg-rose-50 px-4 py-2 text-[13px] text-rose-700">
                    {uploadError}
                </div>
            ) : null}
        </div>
    );
}

function imageFilesFromList(list: FileList | null | undefined): File[] {
    if (!list || list.length === 0) return [];
    return Array.from(list).filter((file) => file.type.startsWith("image/"));
}

// ProseMirror positions are not stable across edits, so the swap / removal
// helpers re-find the pending image by matching its (unique) blob src.
function forEachImageNode(editor: Editor, cb: (pos: number, src: string) => void) {
    editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && typeof node.attrs.src === "string") {
            cb(pos, node.attrs.src);
        }
        return true;
    });
}

function swapImageSrc(editor: Editor, fromSrc: string, toSrc: string) {
    let target: number | null = null;
    forEachImageNode(editor, (pos, src) => {
        if (src === fromSrc) target = pos;
    });
    if (target === null) return;
    const node = editor.state.doc.nodeAt(target);
    if (!node) return;
    // Dispatching a doc-changing transaction makes TipTap fire onUpdate, which
    // propagates the swapped src into the serialized HTML the parent holds.
    editor.view.dispatch(
        editor.state.tr.setNodeMarkup(target, undefined, { ...node.attrs, src: toSrc }),
    );
}

function removeImageBySrc(editor: Editor, src: string) {
    let target: number | null = null;
    let nodeSize = 0;
    forEachImageNode(editor, (pos, nodeSrc) => {
        if (nodeSrc === src) {
            target = pos;
            const node = editor.state.doc.nodeAt(pos);
            nodeSize = node?.nodeSize ?? 1;
        }
    });
    if (target === null) return;
    editor.view.dispatch(editor.state.tr.delete(target, target + nodeSize));
}
