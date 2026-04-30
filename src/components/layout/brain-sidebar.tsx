"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, AlertCircle, Wand2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { streamAIChat, ChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BrainSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    onOpenTaskGenerator?: () => void;
}

export function BrainSidebar({ isOpen, onClose, projectId, onOpenTaskGenerator }: BrainSidebarProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hi! I'm the Project Brain. I have context on all your tasks. Ask me anything about your project status, blockers, or recommendations.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasCreatedMessageRef = useRef(false);
    const assistantContentRef = useRef("");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        if (!projectId) {
            setError("Please select a project to use the AI Brain");
            return;
        }

        const userMessage = input.trim();
        const newUserMsg: ChatMessage = { role: "user", content: userMessage };

        // Capture current messages and add user message
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
            // onChunk
            (chunk: string) => {
                assistantContentRef.current += chunk;

                if (!hasCreatedMessageRef.current) {
                    // First chunk - create new assistant message using captured messages
                    hasCreatedMessageRef.current = true;
                    setMessages([...updatedMessages, { role: "assistant", content: assistantContentRef.current }]);
                } else {
                    // Subsequent chunks - update last message
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: "assistant", content: assistantContentRef.current };
                        return updated;
                    });
                }
            },
            // onComplete
            () => {
                setIsTyping(false);
            },
            // onError
            (errorMsg: string) => {
                setError(errorMsg);
                setIsTyping(false);
                assistantContentRef.current = "";
                hasCreatedMessageRef.current = false;
                // Remove the incomplete assistant message if any
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
            }
        );
    };

    return (
        <div
            className={cn(
                "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-slate-200 bg-white shadow-[0_26px_90px_rgba(15,23,42,0.18)] transform transition-all duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full",
                isExpanded ? "w-[760px]" : "w-[380px]"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight text-slate-950">Project Brain</h2>
                        <p className="text-xs font-medium text-slate-500">AI Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        title={isExpanded ? "Minimize sidebar" : "Maximize sidebar"}
                        aria-label={isExpanded ? "Minimize Project Brain" : "Expand Project Brain"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        aria-label="Close Project Brain"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5">
                {error && (
                    <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-fg)]">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!projectId && (
                    <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Please select a project to enable AI assistance</span>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                        {msg.role === "assistant" && (
                            <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Bot className="h-4 w-4" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[82%] rounded-[1.1rem] px-3.5 py-3 text-sm leading-6 shadow-sm",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-slate-200 bg-white text-slate-800"
                            )}
                        >
                            {msg.role === "assistant" ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="my-1">{children}</p>,
                                        ul: ({ children }) => <ul className="my-1 list-disc list-inside">{children}</ul>,
                                        ol: ({ children }) => <ol className="my-1 list-decimal list-inside">{children}</ol>,
                                        li: ({ children }) => <li className="my-0">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{children}</code>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : (
                                <span className="whitespace-pre-wrap">{msg.content}</span>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="space-y-3 border-t border-slate-200 bg-white px-5 py-4">
                {/* Quick Action Prompts */}
                {projectId && messages.length <= 1 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Try asking</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Show me overdue tasks",
                                "What's Alice working on?",
                                "Summarize the project",
                                "High priority tasks",
                                "Tasks in progress",
                            ].map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => setInput(prompt)}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-950"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {projectId && onOpenTaskGenerator && (
                    <button
                        onClick={onOpenTaskGenerator}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[1rem] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(109,93,252,0.20)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                        <Wand2 className="h-4 w-4" />
                        Generate Tasks with AI
                    </button>
                )}
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your project..."
                        className="h-12 w-full rounded-[1rem] border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-950 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
