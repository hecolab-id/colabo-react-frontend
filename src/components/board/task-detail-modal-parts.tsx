"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Activity, ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";
import { getLinkPreview } from "@/lib/api";
import type { ActivityLog, Comment, LinkPreview, User as AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { formatTaskDateTime } from "@/lib/task-ui";

export function canReadAllProjects(member: AppUser) {
    return member.roles?.some((role) => (
        ["OWNER", "ADMIN"].includes(role.name.toUpperCase()) ||
        role.permissions?.some((permission) => permission.name === "projects:read_all")
    )) ?? false;
}

const urlPattern = /https?:\/\/[^\s<>"')\]]+/i;

export function extractFirstUrl(value: string) {
    const match = value.match(urlPattern);
    return match?.[0]?.replace(/[.,!?;:]+$/, "") || null;
}

export function CommentLinkPreview({ url }: { url: string }) {
    const [preview, setPreview] = useState<LinkPreview | null>(null);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

    useEffect(() => {
        const controller = new AbortController();

        getLinkPreview(url, controller.signal)
            .then((data) => {
                setPreview(data);
                setStatus("success");
            })
            .catch((error) => {
                if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
                    return;
                }
                setStatus("error");
            });

        return () => controller.abort();
    }, [url]);

    if (status === "error") {
        return null;
    }

    if (status === "loading") {
        return (
            <div className="mt-3 h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80" aria-label="Loading link preview" />
        );
    }

    if (!preview) {
        return null;
    }

    const host = (() => {
        try {
            return new URL(preview.url).hostname.replace(/^www\./, "");
        } catch {
            return preview.site_name || "Link";
        }
    })();

    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
        >
            {preview.image ? (
                <div
                    className="hidden w-28 shrink-0 bg-slate-100 bg-cover bg-center sm:block"
                    style={{ backgroundImage: `url("${preview.image.replace(/"/g, "%22")}")` }}
                    aria-hidden="true"
                />
            ) : null}
            <div className="min-w-0 flex-1 p-3">
                <div className="mb-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    <span className="truncate">{preview.site_name || host}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{preview.title || host}</p>
                {preview.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preview.description}</p>
                ) : null}
            </div>
        </a>
    );
}

export function SectionCard({
    title,
    icon: Icon,
    action,
    children,
    className,
    contentClassName,
}: {
    title: string;
    icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section
            className={cn(
                "border-b border-border/70 pb-6 last:border-b-0",
                className,
            )}
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-normal text-foreground">
                    {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
                    {title}
                </h3>
                {action}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}

export function EmptyState({
    title,
    action,
}: {
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="rounded-[var(--radius-lg)] bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
            <p>{title}</p>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

export function FieldLabel({ children }: { children: ReactNode }) {
    return <span className="mb-2 block text-xs font-medium text-slate-500">{children}</span>;
}

export function TaskCommentBody({ comment }: { comment: Comment }) {
    const mentions = [...(comment.mentions || [])].sort((left, right) => left.start - right.start);
    if (mentions.length === 0) {
        return <p className="mt-2 break-words text-sm leading-6 text-slate-600">{comment.content}</p>;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    mentions.forEach((mention, index) => {
        if (mention.start > cursor) {
            parts.push(<span key={`${comment.id}-text-${index}`}>{comment.content.slice(cursor, mention.start)}</span>);
        }

        parts.push(
            <span
                key={mention.id}
                className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
            >
                {comment.content.slice(mention.start, mention.end)}
            </span>
        );
        cursor = mention.end;
    });

    if (cursor < comment.content.length) {
        parts.push(<span key={`${comment.id}-tail`}>{comment.content.slice(cursor)}</span>);
    }

    return <p className="mt-2 break-words text-sm leading-6 text-slate-600">{parts}</p>;
}

export function ActivityLogItem({ log }: { log: ActivityLog }) {
    return (
        <article className="flex gap-3 border-b border-slate-200/70 px-1 py-3 text-sm last:border-b-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Activity className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="break-words leading-6 text-slate-700">
                    <span className="font-semibold text-slate-950">{log.user.name}</span>{" "}
                    <span className="text-slate-600">{formatActivityText(log)}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatTaskDateTime(log.created_at)}</p>
            </div>
        </article>
    );
}

function formatActivityText(log: ActivityLog) {
    switch (log.action_type) {
        case "STATUS_CHANGE":
        case "TASK_STATUS_CHANGED":
            return `changed status from ${log.old_value || "None"} to ${log.new_value}`;
        case "ASSIGNED":
            return `assigned this task to ${log.new_value}`;
        case "TASK_ASSIGNED":
            return `assigned this task to ${log.metadata?.assignee_user_name || log.new_value || "someone"}`;
        case "CREATED":
        case "TASK_CREATED":
            return "created this task";
        case "TITLE_CHANGE":
        case "TASK_RENAMED":
            return `renamed task from "${log.old_value}" to "${log.new_value}"`;
        case "DESCRIPTION_CHANGE":
        case "TASK_DESCRIPTION_UPDATED":
            return "updated the description";
        case "PRIORITY_CHANGE":
        case "TASK_PRIORITY_CHANGED":
            return `changed priority from ${log.old_value} to ${log.new_value}`;
        case "TASK_MOVED":
            return `moved this task to ${log.metadata?.to_column_name || log.new_value || "another column"}`;
        case "TASK_COMMENTED":
            return "commented on this task";
        default:
            return "updated this task";
    }
}

// The description HTML comes from the editor and is rendered to other users, so
// sanitize it (defense against stored XSS) and force every link to open safely
// in a new tab.
let domPurifyLinkHookReady = false;

export function enhanceRichTextLinks(html: string): string {
    if (typeof window === "undefined" || !html) return html;
    if (!domPurifyLinkHookReady) {
        DOMPurify.addHook("afterSanitizeAttributes", (node) => {
            if (node.tagName === "A" && node.getAttribute("href")) {
                node.setAttribute("target", "_blank");
                node.setAttribute("rel", "noopener noreferrer nofollow");
            }
        });
        domPurifyLinkHookReady = true;
    }
    return DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
}
