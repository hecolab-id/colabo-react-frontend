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
                "fixed inset-y-0 right-0 bg-card border-l border-border shadow-2xl transform transition-all duration-300 ease-in-out z-50 flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full",
                isExpanded ? "w-[800px]" : "w-96"
            )}
        >
            {/* Header */}
            <div className="p-4 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-medium text-foreground">Project Brain</h2>
                        <p className="text-xs text-muted-foreground">AI Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-muted-foreground hover:text-foreground transition-colors hover:cursor-pointer"
                        title={isExpanded ? "Minimize sidebar" : "Maximize sidebar"}
                    >
                        {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors hover:cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!projectId && (
                    <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Please select a project to enable AI assistance</span>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[80%] p-3 rounded-xl text-sm",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
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
                                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
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
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border space-y-3">
                {/* Quick Action Prompts */}
                {projectId && messages.length <= 1 && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
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
                                    className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border hover:cursor-pointer"
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm hover:cursor-pointer"
                    >
                        <Wand2 className="w-4 h-4" />
                        Generate Tasks with AI
                    </button>
                )}
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your project..."
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors disabled:opacity-50 hover:cursor-pointer"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
