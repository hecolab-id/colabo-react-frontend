"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
    ChangeEventHandler,
    FormEventHandler,
    KeyboardEventHandler,
    RefObject,
} from "react";
import { Activity, Loader2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ActivityLog, Comment, User as AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTaskDateTime } from "@/lib/task-ui";
import {
    ActivityLogItem,
    CommentLinkPreview,
    EmptyState,
    extractFirstUrl,
    SectionCard,
    TaskCommentBody,
} from "./task-detail-modal-parts";

type MentionRange = { start: number; end: number } | null;

interface MentionPopoverProps {
    activeMentionIndex: number;
    filteredMentionMembers: AppUser[];
    mentionQuery: string;
    mentionRange: MentionRange;
    onSelectMention: (member: AppUser) => void;
}

function MentionPopover({
    activeMentionIndex,
    filteredMentionMembers,
    mentionQuery,
    mentionRange,
    onSelectMention,
}: MentionPopoverProps) {
    if (!mentionRange || (filteredMentionMembers.length === 0 && mentionQuery.trim().length === 0)) {
        return null;
    }

    return (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] md:w-full">
            <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                Mention a project member
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
                {filteredMentionMembers.length > 0 ? (
                    filteredMentionMembers.map((member, index) => (
                        <button
                            key={member.id}
                            type="button"
                            onClick={() => onSelectMention(member)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                index === activeMentionIndex ? "bg-primary/10 text-primary" : "hover:bg-slate-50",
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
    );
}

interface TaskCommentComposerProps {
    activeMentionIndex: number;
    buttonClassName: string;
    comment: string;
    filteredMentionMembers: AppUser[];
    formClassName: string;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    isSubmittingComment: boolean;
    mentionQuery: string;
    mentionRange: MentionRange;
    name: string;
    placeholder: string;
    rows: number;
    textareaClassName: string;
    textareaId: string;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
    onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
    onKeyUp: KeyboardEventHandler<HTMLTextAreaElement>;
    onMentionStateUpdate: (nextComment: string, cursorPosition: number) => void;
    onSelectMention: (member: AppUser) => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
}

export function TaskCommentComposer({
    activeMentionIndex,
    buttonClassName,
    comment,
    filteredMentionMembers,
    formClassName,
    inputRef,
    isSubmittingComment,
    mentionQuery,
    mentionRange,
    name,
    placeholder,
    rows,
    textareaClassName,
    textareaId,
    onChange,
    onKeyDown,
    onKeyUp,
    onMentionStateUpdate,
    onSelectMention,
    onSubmit,
}: TaskCommentComposerProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const maxTextareaHeight = 144;

    const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaHeight)}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
    }, []);

    const setTextareaRefs = useCallback((node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        inputRef.current = node;
        resizeTextarea(node);
    }, [inputRef, resizeTextarea]);

    useEffect(() => {
        resizeTextarea(textareaRef.current);
    }, [comment, resizeTextarea]);

    return (
        <form onSubmit={onSubmit} className={formClassName}>
            <label htmlFor={textareaId} className="sr-only">Write a comment</label>
            <div className="relative">
                <div className="flex items-end gap-2 rounded-[1rem] border border-border bg-muted/20 px-3 py-1.5 transition-[border-color,box-shadow,background-color] focus-within:border-primary/45 focus-within:bg-[var(--modal-surface)] focus-within:ring-2 focus-within:ring-primary/10">
                    <textarea
                        ref={setTextareaRefs}
                        id={textareaId}
                        name={name}
                        value={comment}
                        onChange={onChange}
                        onKeyDown={onKeyDown}
                        onClick={(event) => onMentionStateUpdate(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                        onKeyUp={onKeyUp}
                        placeholder={placeholder}
                        autoComplete="off"
                        rows={rows}
                        className={textareaClassName}
                    />
                    <button
                        type="submit"
                        disabled={!comment.trim() || isSubmittingComment}
                        aria-label="Send comment"
                        className={cn("inline-flex items-center justify-center", buttonClassName)}
                    >
                        {isSubmittingComment ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Send className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>

                <MentionPopover
                    activeMentionIndex={activeMentionIndex}
                    filteredMentionMembers={filteredMentionMembers}
                    mentionQuery={mentionQuery}
                    mentionRange={mentionRange}
                    onSelectMention={onSelectMention}
                />
            </div>
        </form>
    );
}

interface TaskCommentsActivitySectionProps {
    activeMentionIndex: number;
    activities: ActivityLog[];
    anchorRef: RefObject<HTMLSpanElement | null>;
    comment: string;
    commentInputRef: RefObject<HTMLTextAreaElement | null>;
    comments: Comment[];
    filteredMentionMembers: AppUser[];
    isSubmittingComment: boolean;
    mentionQuery: string;
    mentionRange: MentionRange;
    onCommentChange: ChangeEventHandler<HTMLTextAreaElement>;
    onCommentKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
    onCommentKeyUp: KeyboardEventHandler<HTMLTextAreaElement>;
    onMentionStateUpdate: (nextComment: string, cursorPosition: number) => void;
    onSelectMention: (member: AppUser) => void;
    onSend: FormEventHandler<HTMLFormElement>;
}

export function TaskCommentsActivitySection({
    activeMentionIndex,
    activities,
    anchorRef,
    comment,
    commentInputRef,
    comments,
    filteredMentionMembers,
    isSubmittingComment,
    mentionQuery,
    mentionRange,
    onCommentChange,
    onCommentKeyDown,
    onCommentKeyUp,
    onMentionStateUpdate,
    onSelectMention,
    onSend,
}: TaskCommentsActivitySectionProps) {
    const feedItems = useMemo(() => {
        const commentItems = comments.map((item) => ({
            id: `comment-${item.id}`,
            kind: "comment" as const,
            createdAt: item.created_at,
            data: item,
        }));
        const activityItems = activities.map((item) => ({
            id: `activity-${item.id}`,
            kind: "activity" as const,
            createdAt: item.created_at,
            data: item,
        }));

        return [...commentItems, ...activityItems].sort((left, right) => {
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        });
    }, [activities, comments]);

    return (
        <SectionCard
            title="Activity"
            icon={Activity}
            className="scroll-mt-28"
        >
            <span ref={anchorRef} className="block h-0" aria-hidden="true" />
            <div className="space-y-4">
                {feedItems.length > 0 ? (
                    <div>
                        {feedItems.map((item) => {
                            if (item.kind === "activity") {
                                return <ActivityLogItem key={item.id} log={item.data} />;
                            }

                            const firstUrl = extractFirstUrl(item.data.content);

                            return (
                                <article key={item.id} className="flex gap-3 border-b border-slate-200/70 px-1 py-3 last:border-b-0">
                                    <Avatar user={item.data.user} size="md" tone="tint" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="text-sm font-semibold text-slate-950">{item.data.user.name}</span>
                                            <span className="text-xs text-slate-500">{formatTaskDateTime(item.data.created_at)}</span>
                                        </div>
                                        <TaskCommentBody comment={item.data} />
                                        {firstUrl ? <CommentLinkPreview key={firstUrl} url={firstUrl} /> : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState title="No activity yet. Add a comment or update this task to start the timeline." />
                )}

                <TaskCommentComposer
                    activeMentionIndex={activeMentionIndex}
                    buttonClassName="h-8 w-8 shrink-0 touch-manipulation rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    comment={comment}
                    filteredMentionMembers={filteredMentionMembers}
                    formClassName="hidden pt-2 md:block"
                    inputRef={commentInputRef}
                    isSubmittingComment={isSubmittingComment}
                    mentionQuery={mentionQuery}
                    mentionRange={mentionRange}
                    name="task_comment"
                    placeholder="Write a comment… Use @ to mention a project member."
                    rows={1}
                    textareaClassName="min-h-8 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:!outline-none focus:!ring-0 focus:!ring-offset-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
                    textareaId="task-comment"
                    onChange={onCommentChange}
                    onKeyDown={onCommentKeyDown}
                    onKeyUp={onCommentKeyUp}
                    onMentionStateUpdate={onMentionStateUpdate}
                    onSelectMention={onSelectMention}
                    onSubmit={onSend}
                />
            </div>
        </SectionCard>
    );
}
