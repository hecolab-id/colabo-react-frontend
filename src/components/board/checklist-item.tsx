"use client";

import { ChecklistItem as ChecklistItemType } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Trash2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChecklistItemProps {
    item: ChecklistItemType;
    onToggle: (itemId: string, isDone: boolean) => void;
    onDelete: (itemId: string) => void;
    onUpdate: (itemId: string, content: string) => void;
}

export function ChecklistItem({ item, onToggle, onDelete, onUpdate }: ChecklistItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(item.content);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (content.trim() !== item.content) {
            onUpdate(item.id, content);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setContent(item.content);
            setIsEditing(false);
        }
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 bg-muted/50 p-2 rounded border border-border"
            >
                <div className="h-6" />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-start gap-2 py-1.5 px-2 hover:bg-muted/30 rounded transition-colors"
        >
            <div
                {...attributes}
                {...listeners}
                className="mt-0.5 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted-foreground"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1 flex items-start gap-2">
                <button
                    onClick={() => onToggle(item.id, !item.is_done)}
                    aria-label={item.is_done ? "Mark checklist item as incomplete" : "Mark checklist item as complete"}
                    className={cn(
                        "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        item.is_done
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground hover:border-primary"
                    )}
                >
                    {item.is_done && <Check className="w-3 h-3" />}
                </button>

                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm bg-transparent border-none outline-none p-0 focus:ring-0"
                    />
                ) : (
                    <span
                        onClick={() => setIsEditing(true)}
                        className={cn(
                            "flex-1 text-sm cursor-text",
                            item.is_done && "text-muted-foreground line-through"
                        )}
                    >
                        {item.content}
                    </span>
                )}
            </div>

            <button
                onClick={() => onDelete(item.id)}
                aria-label={`Delete checklist item ${item.content}`}
                className="p-0.5 text-muted-foreground opacity-0 transition-[color,opacity] group-hover:opacity-100 hover:text-[var(--danger-fg)]"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
