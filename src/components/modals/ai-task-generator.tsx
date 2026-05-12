"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Loader2, Plus, Sparkles, X } from "lucide-react";
import { createTask, GeneratedTask, generateTasksWithAI } from "@/lib/api";
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

    const generatedCount = useMemo(() => {
        if (mode === "prd") {
            return detailOptions.find((option) => option.value === detailLevel)?.count || 15;
        }
        return Math.min(Math.max(quickCount, 1), 20);
    }, [detailLevel, mode, quickCount]);

    useEscapeKey(isOpen && !isGenerating && !isCreating, () => {
        handleClose();
    });

    const resetDraft = () => {
        setGeneratedTasks([]);
        setSelectedTasks(new Set());
        setAiMessage("");
        setError(null);
    };

    const handleGenerate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedTasks([]);
        setAiMessage("");

        try {
            const plannerPrompt = buildPlannerPrompt({
                mode,
                prompt,
                detailLevel,
                projectName,
                projectDescription,
            });
            const response = await generateTasksWithAI(projectId, plannerPrompt, generatedCount);
            setGeneratedTasks(response.tasks);
            setAiMessage(response.message);
            setSelectedTasks(new Set(response.tasks.map((_, index) => index)));
        } catch (err) {
            console.error("Failed to generate tasks:", err);
            setError(err instanceof Error ? err.message : "Failed to generate tasks");
        } finally {
            setIsGenerating(false);
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
        onClose();
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
            onClick={handleClose}
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
                        onClick={handleClose}
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

                            <div>
                                <label htmlFor="ai-planner-input" className="mb-2 block text-sm font-semibold text-slate-900">
                                    {mode === "prd" ? "PRD or product brief" : "Prompt"}
                                </label>
                                <textarea
                                    id="ai-planner-input"
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.target.value)}
                                    placeholder={
                                        mode === "prd"
                                            ? "Paste the PRD or feature brief here."
                                            : "Example: Create tasks for user authentication with password reset and email verification."
                                    }
                                    rows={mode === "prd" ? 9 : 5}
                                    className="w-full resize-none rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                                />
                            </div>

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
                                disabled={!prompt.trim() || isGenerating}
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
