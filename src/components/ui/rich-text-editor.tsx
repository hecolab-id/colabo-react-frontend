"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Underline as UnderlineIcon, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
    className?: string;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Write something...",
    editable = true,
    className,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
            }),
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
        },
        immediatelyRender: false,
    });

    // Update content if it changes externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

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
        icon: any;
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
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    );
}
