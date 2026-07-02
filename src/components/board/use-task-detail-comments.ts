"use client";

import {
    useCallback,
    useMemo,
    useState,
    type ChangeEvent,
    type Dispatch,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type RefObject,
    type SetStateAction,
} from "react";
import { addComment } from "@/lib/api";
import type { Comment, CommentMention, Task, Team, User as AppUser } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { canReadAllProjects } from "./task-detail-modal-parts";

type MentionRange = { start: number; end: number };

export type MentionDraft = Pick<CommentMention, "user_id" | "display_text" | "start" | "end"> & {
    local_id: string;
    user: AppUser;
};

interface UseTaskDetailCommentsArgs {
    task: Task;
    taskState: Task;
    currentTeam?: Team | null;
    currentUser?: AppUser | null;
    commentInputRef: RefObject<HTMLTextAreaElement | null>;
    setTaskState: Dispatch<SetStateAction<Task>>;
    onUpdate?: (task: Task) => void;
}

export function useTaskDetailComments({
    task,
    taskState,
    currentTeam,
    currentUser,
    commentInputRef,
    setTaskState,
    onUpdate,
}: UseTaskDetailCommentsArgs) {
    const [comment, setComment] = useState("");
    const [draftMentions, setDraftMentions] = useState<MentionDraft[]>([]);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [comments, setComments] = useState<Comment[]>(task.comments || []);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
            member.email.toLowerCase().includes(normalizedQuery),
        );
    }, [mentionQuery, mentionRange, mentionableMembers]);

    const resetComments = useCallback((nextTask: Task) => {
        setComment("");
        setDraftMentions([]);
        setMentionQuery("");
        setMentionRange(null);
        setActiveMentionIndex(0);
        setComments(nextTask.comments || []);
        setIsSubmittingComment(false);
    }, []);

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
        if (!comment.trim() || isSubmittingComment) return;

        setIsSubmittingComment(true);
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
            toast.error("Couldn't post your comment. Please try again.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

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

    return {
        activeMentionIndex,
        comment,
        comments,
        filteredMentionMembers,
        handleCommentChange,
        handleCommentKeyDown,
        handleCommentKeyUp,
        handleSend,
        isSubmittingComment,
        mentionQuery,
        mentionRange,
        resetComments,
        selectMention,
        setComments,
        updateMentionState,
    };
}
