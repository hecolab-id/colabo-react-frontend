"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, FileText, FileUp, Loader2, Plus, Sparkles, X } from "lucide-react";
import { createTask, GeneratedTask, generateTasksWithAI } from "@/lib/api";
import {
    ACCEPTED_DOCUMENT_TYPES,
    DocumentParseError,
    extractDocumentText,
    isAcceptedDocument,
} from "@/lib/extract-document-text";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { cn } from "@/lib/utils";

type PlannerMode = "quick" | "prd";
type DetailLevel = "lean" | "balanced" | "detailed";

interface AITaskGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName?: string;
    projectDescription?: string;
    onTasksCreated?: () => void;
}

const detailOptions: Array<{ value: DetailLevel; label: string; count: number }> = [
    { value: "lean", label: "Lean", count: 8 },
    { value: "balanced", label: "Balanced", count: 15 },
    { value: "detailed", label: "Detailed", count: 20 },
];

const priorityColors = {
    HIGH: "border-[var(--priority-high-border)] bg-[var(--priority-high-bg)] text-[var(--priority-high-fg)]",
    MEDIUM: "border-[var(--priority-medium-border)] bg-[var(--priority-medium-bg)] text-[var(--priority-medium-fg)]",
    LOW: "border-[var(--priority-low-border)] bg-[var(--priority-low-bg)] text-[var(--priority-low-fg)]",
};

function buildPlannerPrompt({
    mode,
    prompt,
    detailLevel,
    projectName,
    projectDescription,
}: {
    mode: PlannerMode;
    prompt: string;
    detailLevel: DetailLevel;
    projectName?: string;
    projectDescription?: string;
}) {
    const projectContext = [
        projectName ? `Project name: ${projectName}` : null,
        projectDescription?.trim() ? `Project description: ${projectDescription.trim()}` : null,
    ].filter(Boolean).join("\n");

    if (mode === "prd") {
        return [
            "Mode: PRD to Tasks.",
            "Create a safe draft execution plan from the PRD below.",
            "Rules:",
            "- Treat the PRD as the source of truth.",
            "- Use the project context only as guardrails for product scope and terminology.",
            "- Do not invent major features outside the PRD.",
            "- Keep tasks concise, actionable, and implementation-ready.",
            "- Prefer clear descriptions with acceptance criteria or checklist-style details inside the description.",
            "- Do not assign users, create labels, create dependencies, or assume estimates.",
            `- Detail level: ${detailLevel}.`,
            projectContext ? `\nProject context:\n${projectContext}` : null,
            `\nPRD:\n${prompt.trim()}`,
        ].filter(Boolean).join("\n");
    }

    return [
        "Mode: Quick task generation.",
        "Generate a small, practical set of task drafts from the request below.",
        "Rules:",
        "- Keep task titles short.",
        "- Use descriptions that explain the expected outcome.",
        "- Avoid dependencies, assignees, labels, and estimates.",
        projectContext ? `\nProject context:\n${projectContext}` : null,
        `\nRequest:\n${prompt.trim()}`,
    ].filter(Boolean).join("\n");
}

export function AITaskGenerator({
    isOpen,
    onClose,
    projectId,
    projectName,
    projectDescription,
    onTasksCreated,
}: AITaskGeneratorProps) {
    const [mode, setMode] = useState<PlannerMode>("quick");
    const [prompt, setPrompt] = useState("");
    const [detailLevel, setDetailLevel] = useState<DetailLevel>("balanced");
    const [quickCount, setQuickCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
    const [aiMessage, setAiMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [attachedFile, setAttachedFile] = useState<{ name: string; wordCount: number; truncated: boolean } | null>(null);
    const [prdText, setPrdText] = useState("");
    const [pendingName, setPendingName] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const removeBtnRef = useRef<HTMLButtonElement>(null);
    // Bumped whenever the upload is reset or the modal closes; in-flight parse /
    // generate calls capture it and discard their results if it changed, so a
    // close mid-flight can't repopulate state onto a dismissed modal.
    const runTokenRef = useRef(0);

    const generatedCount = useMemo(() => {
        if (mode === "prd") {
            return detailOptions.find((option) => option.value === detailLevel)?.count || 15;
        }
        return Math.min(Math.max(quickCount, 1), 20);
    }, [detailLevel, mode, quickCount]);

    // Escape, backdrop, and the X all close consistently: allowed while parsing
    // or generating (now safe via runTokenRef), blocked only while writing tasks.
    useEscapeKey(isOpen && !isCreating, () => {
        requestClose();
    });

    // Keep keyboard focus in context after a file parses (the dropzone button
    // that had focus unmounts), and announce the result via the live region.
    useEffect(() => {
        if (attachedFile) removeBtnRef.current?.focus();
    }, [attachedFile]);

    const resetDraft = () => {
        setGeneratedTasks([]);
        setSelectedTasks(new Set());
        setAiMessage("");
        setError(null);
    };

    const clearUpload = () => {
        runTokenRef.current += 1;
        setAttachedFile(null);
        setPrdText("");
        setPendingName("");
        setParseError(null);
        setIsParsing(false);
        setIsDragging(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const parseFile = async (file: File) => {
        if (!isAcceptedDocument(file)) {
            setParseError("Unsupported file type. Upload a PDF, Markdown, or text file.");
            return;
        }
        const token = runTokenRef.current;
        setParseError(null);
        setIsParsing(true);
        setPendingName(file.name);
        try {
            const { text, wordCount, truncated } = await extractDocumentText(file);
            if (runTokenRef.current !== token) return;
            setPrdText(text);
            setAttachedFile({ name: file.name, wordCount, truncated });
        } catch (err) {
            if (runTokenRef.current !== token) return;
            const message =
                err instanceof DocumentParseError
                    ? err.message
                    : "We couldn't read this file. Paste the text instead.";
            console.error("Failed to read PRD document:", err);
            setParseError(message);
            setAttachedFile(null);
            setPrdText("");
        } finally {
            if (runTokenRef.current === token) {
                setIsParsing(false);
                setPendingName("");
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) void parseFile(file);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void parseFile(file);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
        }
    };

    const handleGenerate = async (event: React.FormEvent) => {
        event.preventDefault();
        const sourceText = mode === "prd" && attachedFile ? prdText : prompt;
        if (!sourceText.trim() || isGenerating || isParsing) return;

        const token = runTokenRef.current;
        setIsGenerating(true);
        setError(null);
        setGeneratedTasks([]);
        setAiMessage("");

        try {
            const plannerPrompt = buildPlannerPrompt({
                mode,
                prompt: sourceText,
                detailLevel,
                projectName,
                projectDescription,
            });
            const response = await generateTasksWithAI(projectId, plannerPrompt, generatedCount);
            if (runTokenRef.current !== token) return;
            setGeneratedTasks(response.tasks);
            setAiMessage(response.message);
            setSelectedTasks(new Set(response.tasks.map((_, index) => index)));
        } catch (err) {
            if (runTokenRef.current !== token) return;
            console.error("Failed to generate tasks:", err);
            setError(err instanceof Error ? err.message : "Failed to generate tasks");
        } finally {
            if (runTokenRef.current === token) setIsGenerating(false);
        }
    };

    const handleCreateTasks = async () => {
        if (selectedTasks.size === 0) return;

        setIsCreating(true);
        setError(null);

        try {
            const tasksToCreate = generatedTasks.filter((_, index) => selectedTasks.has(index));

            for (const task of tasksToCreate) {
                await createTask(projectId, task.title, "TODO", undefined, task.description, task.priority);
            }

            onTasksCreated?.();
            handleClose();
        } catch (err) {
            console.error("Failed to create tasks:", err);
            setError(err instanceof Error ? err.message : "Failed to create tasks");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setMode("quick");
        setPrompt("");
        setDetailLevel("balanced");
        setQuickCount(5);
        setGeneratedTasks([]);
        setSelectedTasks(new Set());
        setAiMessage("");
        setError(null);
        setIsGenerating(false);
        setIsCreating(false);
        clearUpload();
        onClose();
    };

    // Don't tear down while tasks are being written; otherwise close freely
    // (in-flight parse/generate are made safe by runTokenRef).
    const requestClose = () => {
        if (isCreating) return;
        handleClose();
    };

    const toggleTask = (index: number) => {
        const nextSelected = new Set(selectedTasks);
        if (nextSelected.has(index)) {
            nextSelected.delete(index);
        } else {
            nextSelected.add(index);
        }
        setSelectedTasks(nextSelected);
    };

    if (!isOpen) return null;

    const modeLabel = mode === "prd" ? "PRD to Tasks" : "Quick Prompt";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/36 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={requestClose}
        >
            <div
                className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[1.5rem]"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            AI Planner
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Generate draft tasks</h2>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                            {projectName ? `For ${projectName}` : "For this project"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        aria-label="Close AI planner"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    {generatedTasks.length === 0 ? (
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="grid grid-cols-2 rounded-[1rem] border border-slate-200 bg-slate-50 p-1">
                                {([
                                    { value: "quick", label: "Quick Prompt", icon: Sparkles },
                                    { value: "prd", label: "PRD to Tasks", icon: FileText },
                                ] as const).map((item) => {
                                    const Icon = item.icon;
                                    const isActive = mode === item.value;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => {
                                                setMode(item.value);
                                                resetDraft();
                                                clearUpload();
                                            }}
                                            className={cn(
                                                "flex h-10 items-center justify-center gap-2 rounded-[0.8rem] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                isActive ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Project context</p>
                                        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{projectName || "Current project"}</p>
                                    </div>
                                    <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                        {modeLabel} · max {generatedCount}
                                    </span>
                                </div>
                                {projectDescription?.trim() ? (
                                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{projectDescription}</p>
                                ) : null}
                            </div>

                            {mode === "prd" ? (
                                <div>
                                    <label htmlFor="ai-planner-input" className="mb-2 block text-sm font-semibold text-slate-900">
                                        PRD or product brief
                                    </label>

                                    <p role="status" aria-live="polite" className="sr-only">
                                        {isParsing
                                            ? `Reading ${pendingName || "your document"}`
                                            : attachedFile
                                                ? `${attachedFile.name}, ${attachedFile.wordCount.toLocaleString()} ${attachedFile.wordCount === 1 ? "word" : "words"} detected, ready to generate`
                                                : ""}
                                    </p>

                                    {attachedFile ? (
                                        <div className="flex items-center gap-3 rounded-[1rem] border border-primary/25 bg-primary/[0.06] px-4 py-3.5">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] bg-white text-primary ring-1 ring-primary/15">
                                                <FileText className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">{attachedFile.name}</p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {attachedFile.wordCount.toLocaleString()} {attachedFile.wordCount === 1 ? "word" : "words"}
                                                    {attachedFile.truncated ? " · trimmed to fit" : ""} · ready to generate
                                                </p>
                                            </div>
                                            <button
                                                ref={removeBtnRef}
                                                type="button"
                                                onClick={clearUpload}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                                aria-label={`Remove ${attachedFile.name}`}
                                            >
                                                <X className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ) : isParsing ? (
                                        <div className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    Reading {pendingName || "your document"}…
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">Extracting text from your document</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={cn(
                                                        "flex w-full flex-col items-center justify-center gap-2 rounded-[1rem] border border-dashed px-6 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                        isDragging
                                                            ? "border-primary/55 bg-primary/[0.06]"
                                                            : "border-slate-300 bg-slate-50/70 hover:border-primary/40 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-slate-200">
                                                        <FileUp className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        Drop your PRD here, or <span className="text-primary">browse</span>
                                                    </span>
                                                    <span className="text-xs text-slate-500">PDF, Markdown, or text · up to 10 MB</span>
                                                </button>
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept={ACCEPTED_DOCUMENT_TYPES}
                                                onChange={handleInputChange}
                                                className="hidden"
                                                aria-label="Upload a PRD document"
                                            />

                                            <div className="my-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                                                or paste it directly
                                                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                                            </div>

                                            <textarea
                                                id="ai-planner-input"
                                                value={prompt}
                                                onChange={(event) => setPrompt(event.target.value)}
                                                placeholder="Paste the PRD or feature brief here."
                                                rows={6}
                                                className="w-full resize-none rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                                            />
                                        </>
                                    )}

                                    {parseError ? (
                                        <div role="alert" className="mt-3 flex items-start gap-2 rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>{parseError}</span>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="ai-planner-input" className="mb-2 block text-sm font-semibold text-slate-900">
                                        Prompt
                                    </label>
                                    <textarea
                                        id="ai-planner-input"
                                        value={prompt}
                                        onChange={(event) => setPrompt(event.target.value)}
                                        placeholder="Example: Create tasks for user authentication with password reset and email verification."
                                        rows={5}
                                        className="w-full resize-none rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                                    />
                                </div>
                            )}

                            {mode === "prd" ? (
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {detailOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setDetailLevel(option.value)}
                                            className={cn(
                                                "rounded-[0.9rem] border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                detailLevel === option.value
                                                    ? "border-primary/35 bg-primary/10 text-primary"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                                            )}
                                        >
                                            {option.label}
                                            <span className="ml-1 text-xs font-medium opacity-70">{option.count}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                                    <label htmlFor="ai-planner-count" className="text-sm font-semibold text-slate-900">
                                        Number of tasks
                                    </label>
                                    <input
                                        id="ai-planner-count"
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={quickCount}
                                        onChange={(event) => setQuickCount(parseInt(event.target.value, 10) || 5)}
                                        className="h-10 w-24 rounded-[0.9rem] border border-slate-300 bg-white px-3 text-center text-sm font-semibold text-slate-950 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                                    />
                                </div>
                            )}

                            {error ? (
                                <div className="rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={
                                    (mode === "prd" && attachedFile ? !prdText.trim() : !prompt.trim()) ||
                                    isGenerating ||
                                    isParsing
                                }
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[1rem] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(109,93,252,0.20)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        Generating draft...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                                        Generate Draft
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {aiMessage ? (
                                <div className="rounded-[1.15rem] border border-primary/15 bg-primary/10 px-4 py-3 text-sm leading-6 text-slate-700">
                                    {aiMessage}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-slate-600">
                                    {selectedTasks.size} of {generatedTasks.length} selected
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTasks(
                                            selectedTasks.size === generatedTasks.length
                                                ? new Set()
                                                : new Set(generatedTasks.map((_, index) => index))
                                        );
                                    }}
                                    className="text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                >
                                    {selectedTasks.size === generatedTasks.length ? "Deselect all" : "Select all"}
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {generatedTasks.map((task, index) => {
                                    const isSelected = selectedTasks.has(index);

                                    return (
                                        <button
                                            key={`${task.title}-${index}`}
                                            type="button"
                                            onClick={() => toggleTask(index)}
                                            className={cn(
                                                "w-full rounded-[1.15rem] border p-4 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
                                                isSelected
                                                    ? "border-primary/30 bg-primary/5"
                                                    : "border-slate-200 bg-white hover:border-primary/25"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className={cn(
                                                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-white"
                                                    )}
                                                    aria-hidden="true"
                                                >
                                                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
                                                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityColors[task.priority])}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error ? (
                                <div className="rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                                    {error}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {generatedTasks.length > 0 ? (
                    <footer className="flex flex-col gap-3 border-t border-slate-200/70 bg-white/90 px-5 py-4 backdrop-blur-xl sm:flex-row sm:px-6">
                        <button
                            type="button"
                            onClick={resetDraft}
                            className="h-12 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateTasks}
                            disabled={selectedTasks.size === 0 || isCreating}
                            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Create {selectedTasks.size} Tasks
                                </>
                            )}
                        </button>
                    </footer>
                ) : null}
            </div>
        </div>
    );
}
