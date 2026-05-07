"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, X, Send, Bot, AlertCircle, Wand2, Maximize2, Minimize2, Copy, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { streamAIChat, ChatMessage } from "@/lib/api";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BrainSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    onOpenTaskGenerator?: () => void;
}

const INITIAL_GREETING: ChatMessage = {
    role: "assistant",
    content: "Hi! I'm the Project Brain. I have context on all your tasks. Ask me anything about your project status, blockers, or recommendations.",
};

const QUICK_PROMPTS = [
    "Show me overdue tasks",
    "Summarize the project",
    "What needs attention this week?",
];

const EXPANDED_STORAGE_KEY = "colabo:brain-sidebar:expanded";

export function BrainSidebar({ isOpen, onClose, projectId, onOpenTaskGenerator }: BrainSidebarProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasCreatedMessageRef = useRef(false);
    const assistantContentRef = useRef("");

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

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
            },
            (errorMsg: string) => {
                setError(errorMsg);
                setIsTyping(false);
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
        );
    };

    const handleClear = useCallback(() => {
        setMessages([INITIAL_GREETING]);
        setError(null);
        setInput("");
    }, []);

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

    const showSuggestions = useMemo(() => {
        if (!projectId) return false;
        if (messages.length <= 1) return true;
        return isInputFocused && input.trim().length === 0;
    }, [projectId, messages.length, isInputFocused, input]);

    const sendDisabled = !input.trim() || isTyping || !projectId;
    const hasConversation = messages.length > 1;

    return (
        <div
            className={cn(
                "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-card shadow-glass transform transition-all duration-300 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full",
                isExpanded ? "w-[760px]" : "w-[380px]",
            )}
            role="complementary"
            aria-label="Project Brain assistant"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight text-foreground">Project Brain</h2>
                        <p className="text-xs font-medium text-muted-foreground">AI Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {hasConversation ? (
                        <button
                            onClick={handleClear}
                            disabled={isTyping}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Clear conversation"
                            aria-label="Clear conversation"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    ) : null}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title={isExpanded ? "Collapse to default width" : "Expand to wide view"}
                        aria-label={isExpanded ? "Minimize Project Brain" : "Expand Project Brain"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                    const showCopyForAssistant = isAssistant && msg.content.length > 0;
                    const isCopied = copiedIndex === idx;
                    return (
                        <div
                            key={idx}
                            className={cn("group flex w-full", isAssistant ? "justify-start" : "justify-end")}
                        >
                            {isAssistant && (
                                <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                                    <Bot className="h-4 w-4" />
                                </div>
                            )}
                            <div className="relative max-w-[82%]">
                                <div
                                    className={cn(
                                        "rounded-[1.15rem] px-3.5 py-3 text-sm leading-6 shadow-sm",
                                        isAssistant
                                            ? "border border-border bg-card text-foreground"
                                            : "bg-primary text-primary-foreground",
                                    )}
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
                                            "absolute -bottom-3 left-3 flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-medium text-muted-foreground shadow-sm transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                            isCopied ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                                        )}
                                        aria-label={isCopied ? "Copied" : "Copy answer"}
                                    >
                                        {isCopied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                                        {isCopied ? "Copied" : "Copy"}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex items-center gap-2" aria-live="polite" aria-label="Project Brain is thinking">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" style={{ animationDelay: "0ms", animationDuration: "1200ms" }} />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" style={{ animationDelay: "200ms", animationDuration: "1200ms" }} />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" style={{ animationDelay: "400ms", animationDuration: "1200ms" }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="space-y-3 border-t border-border bg-card px-5 py-4">
                {showSuggestions ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Try asking</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => setInput(prompt)}
                                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {projectId && onOpenTaskGenerator && (
                    <button
                        type="button"
                        onClick={onOpenTaskGenerator}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(109,93,252,0.20)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985]"
                    >
                        <Wand2 className="h-4 w-4" aria-hidden="true" />
                        Generate Tasks with AI
                    </button>
                )}

                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => window.setTimeout(() => setIsInputFocused(false), 150)}
                        placeholder="Ask about your project..."
                        disabled={!projectId}
                        className="h-12 w-full rounded-[1.15rem] border border-border bg-card px-4 pr-12 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={sendDisabled}
                        className={cn(
                            "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            sendDisabled
                                ? "pointer-events-none text-muted-foreground/60"
                                : "text-primary hover:bg-primary/10",
                        )}
                        aria-label={isTyping ? "Project Brain is responding" : "Send message"}
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                    </button>
                </form>
            </div>
        </div>
    );
}
