"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Square, AlertCircle, Wand2, Maximize2, Minimize2, Copy, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { streamAIChat, ChatMessage } from "@/lib/api";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProjectStats {
    totalActive?: number;
    overdueCount?: number;
    dueSoonCount?: number;
    completedThisWeek?: number;
    blockedCount?: number;
}

interface BrainSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    projectName?: string;
    projectStats?: ProjectStats;
    onOpenTaskGenerator?: () => void;
}

const INITIAL_GREETING: ChatMessage = {
    role: "assistant",
    content: "Hi! I'm Project Brain. Ask about your tasks, blockers, or what to focus on.",
};

const FALLBACK_PROMPTS = [
    "Show me overdue tasks",
    "Summarize the project",
    "What needs attention this week?",
];

const EXPANDED_STORAGE_KEY = "colabo:brain-sidebar:expanded";
const TEXTAREA_MAX_HEIGHT_PX = 144; // ~6 rows; clamps growth
const CLEAR_CONFIRM_TIMEOUT_MS = 3000;

function buildPrompts(stats: ProjectStats | undefined): string[] {
    if (!stats) return FALLBACK_PROMPTS;
    const earned: string[] = [];
    if (stats.overdueCount && stats.overdueCount > 0) {
        earned.push(stats.overdueCount === 1 ? "Review the 1 overdue task" : `Review the ${stats.overdueCount} overdue tasks`);
    }
    if (stats.blockedCount && stats.blockedCount > 0) {
        earned.push(stats.blockedCount === 1 ? "Why is the blocked task stuck?" : `Identify the ${stats.blockedCount} blockers`);
    }
    if (stats.dueSoonCount && stats.dueSoonCount > 0) {
        earned.push(stats.dueSoonCount === 1 ? "What's due soon? (1 task)" : `What's due soon? (${stats.dueSoonCount} tasks)`);
    }
    if (stats.completedThisWeek && stats.completedThisWeek > 0) {
        earned.push(`Summarize this week's ${stats.completedThisWeek} completed`);
    }
    if (earned.length === 0) {
        return FALLBACK_PROMPTS;
    }
    // When stats produce real data, trust them; cap at 2 confident chips.
    return earned.slice(0, 2);
}

export function BrainSidebar({ isOpen, onClose, projectId, projectName, projectStats, onOpenTaskGenerator }: BrainSidebarProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [pendingClear, setPendingClear] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasCreatedMessageRef = useRef(false);
    const assistantContentRef = useRef("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const clearTimeoutRef = useRef<number | null>(null);
    const scrollThrottleRef = useRef(0);

    useEscapeKey(isOpen, onClose);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
        if (stored === "true" || stored === "false") {
            setIsExpanded(stored === "true");
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(EXPANDED_STORAGE_KEY, String(isExpanded));
    }, [isExpanded]);

    const scrollToBottom = useCallback((smooth: boolean) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, []);

    useEffect(() => {
        if (isTyping) {
            // During streaming, throttle to once per 200ms with instant scroll
            // so smooth-behavior animations don't queue and interrupt each other.
            const now = Date.now();
            if (now - scrollThrottleRef.current < 200) return;
            scrollThrottleRef.current = now;
            scrollToBottom(false);
        } else {
            // Idle (initial render, completion, user-message append) gets the
            // smooth final scroll.
            scrollToBottom(true);
        }
    }, [messages, isTyping, scrollToBottom]);

    // Cancel any in-flight stream + pending confirms when the drawer is unmounted.
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            if (clearTimeoutRef.current !== null) {
                window.clearTimeout(clearTimeoutRef.current);
            }
        };
    }, []);

    // Reset the pending-clear state if the drawer closes mid-confirm.
    useEffect(() => {
        if (!isOpen && pendingClear) {
            setPendingClear(false);
            if (clearTimeoutRef.current !== null) {
                window.clearTimeout(clearTimeoutRef.current);
                clearTimeoutRef.current = null;
            }
        }
    }, [isOpen, pendingClear]);

    const autosizeTextarea = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
        el.style.height = `${next}px`;
    }, []);

    useEffect(() => {
        autosizeTextarea();
    }, [input, autosizeTextarea]);

    const submitMessage = useCallback(async () => {
        if (!input.trim() || isTyping) return;

        if (!projectId) {
            setError("Please select a project to use the AI Brain");
            return;
        }

        const userMessage = input.trim();
        const newUserMsg: ChatMessage = { role: "user", content: userMessage };

        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setInput("");
        setIsTyping(true);
        setError(null);

        assistantContentRef.current = "";
        hasCreatedMessageRef.current = false;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        await streamAIChat(
            projectId,
            userMessage,
            (chunk: string) => {
                assistantContentRef.current += chunk;
                if (!hasCreatedMessageRef.current) {
                    hasCreatedMessageRef.current = true;
                    setMessages([...updatedMessages, { role: "assistant", content: assistantContentRef.current }]);
                } else {
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: "assistant", content: assistantContentRef.current };
                        return updated;
                    });
                }
            },
            () => {
                setIsTyping(false);
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            },
            (errorMsg: string) => {
                setError(errorMsg);
                setIsTyping(false);
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
                assistantContentRef.current = "";
                hasCreatedMessageRef.current = false;
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
            },
            controller.signal,
        );
    }, [input, isTyping, projectId, messages]);

    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            void submitMessage();
        },
        [submitMessage],
    );

    const handleStop = useCallback(() => {
        const controller = abortControllerRef.current;
        if (!controller) return;
        controller.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
        setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
                if (last.content) {
                    updated[updated.length - 1] = {
                        ...last,
                        content: `${last.content.trimEnd()}\n\n_Stopped._`,
                    };
                } else {
                    updated.pop();
                }
            }
            return updated;
        });
        assistantContentRef.current = "";
        hasCreatedMessageRef.current = false;
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submitMessage();
            }
        },
        [submitMessage],
    );

    const handleClearClick = useCallback(() => {
        if (pendingClear) {
            // Confirmed.
            setMessages([INITIAL_GREETING]);
            setError(null);
            setInput("");
            setPendingClear(false);
            if (clearTimeoutRef.current !== null) {
                window.clearTimeout(clearTimeoutRef.current);
                clearTimeoutRef.current = null;
            }
            return;
        }
        setPendingClear(true);
        if (clearTimeoutRef.current !== null) {
            window.clearTimeout(clearTimeoutRef.current);
        }
        clearTimeoutRef.current = window.setTimeout(() => {
            setPendingClear(false);
            clearTimeoutRef.current = null;
        }, CLEAR_CONFIRM_TIMEOUT_MS);
    }, [pendingClear]);

    const handleCopy = useCallback(async (idx: number, content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedIndex(idx);
            window.setTimeout(() => {
                setCopiedIndex((current) => (current === idx ? null : current));
            }, 1600);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    }, []);

    const prompts = useMemo(() => buildPrompts(projectStats), [projectStats]);
    const showSuggestions = projectId && messages.length <= 1;
    const sendDisabled = !input.trim() || isTyping || !projectId;
    const hasConversation = messages.length > 1;

    const headerSubtitle = useMemo(() => {
        if (!projectId) return null;
        if (projectName) return projectName;
        return null;
    }, [projectId, projectName]);

    return (
        <div
            className={cn(
                "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-card shadow-glass transform transition-[transform,box-shadow] duration-300 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full",
                isExpanded
                    ? "w-full sm:w-[min(760px,90vw)] lg:w-[min(760px,55vw)]"
                    : "w-full sm:w-[380px]",
            )}
            role="complementary"
            aria-label="Project Brain assistant"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                        aria-hidden="true"
                    >
                        <span className="text-sm font-semibold tracking-tight">PB</span>
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight text-foreground">Project Brain</h2>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            {headerSubtitle ? (
                                <span className="truncate" title={headerSubtitle}>{headerSubtitle}</span>
                            ) : (
                                <span className="text-muted-foreground/80">No project selected</span>
                            )}
                            {projectStats?.totalActive && projectStats.totalActive > 0 ? (
                                <>
                                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                    <span className="shrink-0 tabular-nums">{projectStats.totalActive} tasks</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {hasConversation ? (
                        <button
                            onClick={handleClearClick}
                            disabled={isTyping}
                            className={cn(
                                "flex h-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
                                pendingClear
                                    ? "bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                                    : "w-10 px-0 text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                            title={pendingClear ? "Click again to confirm" : "Clear conversation"}
                            aria-label={pendingClear ? "Click again to confirm clear" : "Clear conversation"}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {pendingClear ? <span>Confirm clear</span> : null}
                        </button>
                    ) : null}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="hidden md:flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title={isExpanded ? "Collapse to default width" : "Expand to wide view"}
                        aria-label={isExpanded ? "Minimize Project Brain" : "Expand Project Brain"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label="Close Project Brain"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-5">
                {error && (
                    <div className="flex items-center gap-2 rounded-[1.15rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-fg)]">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {!projectId && (
                    <div className="flex items-center gap-2 rounded-[1.15rem] border border-border bg-card p-3 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Please select a project to enable AI assistance</span>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isAssistant = msg.role === "assistant";
                    const isLast = idx === messages.length - 1;
                    const showCopyForAssistant = isAssistant && msg.content.length > 0 && !(isLast && isTyping);
                    const isCopied = copiedIndex === idx;
                    return (
                        <div
                            key={idx}
                            className={cn("group flex w-full flex-col gap-1.5", isAssistant ? "items-start" : "items-end")}
                        >
                            <div
                                className={cn(
                                    "max-w-[88%] rounded-[1.15rem] px-3.5 py-3 text-sm leading-6 shadow-sm",
                                    isAssistant
                                        ? "border border-border bg-card text-foreground"
                                        : "bg-primary text-primary-foreground",
                                )}
                                aria-live={isAssistant && isLast && isTyping ? "polite" : undefined}
                            >
                                {isAssistant ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }) => <p className="my-1">{children}</p>,
                                            ul: ({ children }) => <ul className="my-1 list-disc list-inside">{children}</ul>,
                                            ol: ({ children }) => <ol className="my-1 list-decimal list-inside">{children}</ol>,
                                            li: ({ children }) => <li className="my-0">{children}</li>,
                                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                            em: ({ children }) => <em className="italic">{children}</em>,
                                            code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
                            </div>
                            {showCopyForAssistant ? (
                                <button
                                    type="button"
                                    onClick={() => handleCopy(idx, msg.content)}
                                    className={cn(
                                        "inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-medium text-muted-foreground transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                        isCopied ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                                    )}
                                    aria-label={isCopied ? "Copied" : "Copy answer"}
                                >
                                    {isCopied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                                    {isCopied ? "Copied" : "Copy"}
                                </button>
                            ) : null}
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex items-center gap-2 pl-1">
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                            aria-live="polite"
                            aria-label="Project Brain is thinking"
                        >
                            <span>Thinking</span>
                            <div className="flex items-center gap-1" aria-hidden="true">
                                <div
                                    className="h-2 w-2 animate-pulse rounded-full"
                                    style={{ backgroundColor: "var(--primary)", animationDelay: "0ms", animationDuration: "1200ms" }}
                                />
                                <div
                                    className="h-2 w-2 animate-pulse rounded-full"
                                    style={{ backgroundColor: "var(--primary)", animationDelay: "200ms", animationDuration: "1200ms" }}
                                />
                                <div
                                    className="h-2 w-2 animate-pulse rounded-full"
                                    style={{ backgroundColor: "var(--primary)", animationDelay: "400ms", animationDuration: "1200ms" }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="space-y-2 border-t border-border bg-card px-5 py-4">
                {showSuggestions ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Try asking</p>
                        <div className="flex flex-wrap gap-2">
                            {prompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setInput(prompt);
                                        textareaRef.current?.focus();
                                    }}
                                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your project..."
                        disabled={!projectId}
                        className="block w-full resize-none rounded-[1.15rem] border border-border bg-card py-3 pl-4 pr-14 text-sm leading-6 text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ minHeight: "3rem", maxHeight: `${TEXTAREA_MAX_HEIGHT_PX}px` }}
                        aria-label="Message Project Brain"
                    />
                    {isTyping ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="absolute right-1.5 bottom-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985]"
                            aria-label="Stop generating"
                            title="Stop generating"
                        >
                            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={sendDisabled}
                            className={cn(
                                "absolute right-1.5 bottom-1.5 flex h-10 w-10 items-center justify-center rounded-full transition-[opacity,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985]",
                                sendDisabled
                                    ? "pointer-events-none bg-muted text-muted-foreground/60"
                                    : "bg-primary text-primary-foreground hover:opacity-95",
                            )}
                            aria-label={!projectId ? "Select a project first" : !input.trim() ? "Type a message to send" : "Send message"}
                        >
                            <Send className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </form>

                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate">
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px]">Enter</kbd>
                        <span className="mx-1">to send,</span>
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px]">Shift</kbd>
                        <span className="mx-1">+</span>
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px]">Enter</kbd>
                        <span className="ml-1">for newline</span>
                    </span>
                    {projectId && onOpenTaskGenerator ? (
                        <button
                            type="button"
                            onClick={onOpenTaskGenerator}
                            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            title="Generate tasks with AI"
                        >
                            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Generate tasks
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
