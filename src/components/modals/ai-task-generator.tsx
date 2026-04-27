"use client";

import { useState } from "react";
import { X, Sparkles, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateTasksWithAI, GeneratedTask, createTask } from "@/lib/api";

interface AITaskGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onTasksCreated?: () => void;
}

export function AITaskGenerator({ isOpen, onClose, projectId, onTasksCreated }: AITaskGeneratorProps) {
    const [prompt, setPrompt] = useState("");
    const [count, setCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
    const [aiMessage, setAiMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedTasks([]);
        setAiMessage("");

        try {
            const response = await generateTasksWithAI(projectId, prompt, count);
            setGeneratedTasks(response.tasks);
            setAiMessage(response.message);
            // Select all tasks by default
            setSelectedTasks(new Set(response.tasks.map((_, idx) => idx)));
        } catch (err) {
            console.error("Failed to generate tasks:", err);
            setError(err instanceof Error ? err.message : "Failed to generate tasks");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleTask = (index: number) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedTasks(newSelected);
    };

    const handleCreateTasks = async () => {
        if (selectedTasks.size === 0) return;

        setIsCreating(true);
        setError(null);

        try {
            const tasksToCreate = generatedTasks.filter((_, idx) => selectedTasks.has(idx));
            
            // Create tasks sequentially to avoid race conditions with position calculation
            for (const task of tasksToCreate) {
                await createTask(
                    projectId,
                    task.title,
                    "TODO",
                    undefined,
                    task.description,
                    task.priority
                );
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
        setPrompt("");
        setGeneratedTasks([]);
        setSelectedTasks(new Set());
        setAiMessage("");
        setError(null);
        onClose();
    };

    const priorityColors = {
        HIGH: "text-red-600 bg-red-50 border-red-200",
        MEDIUM: "text-orange-600 bg-orange-50 border-orange-200",
        LOW: "text-green-600 bg-green-50 border-green-200",
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">AI Task Generator</h2>
                                <p className="text-sm text-muted-foreground">
                                    Describe what you need, and AI will create tasks for you
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Generation Form */}
                    {generatedTasks.length === 0 && (
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    What would you like to accomplish?
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Example: Create tasks for implementing user authentication with social login, password reset, and email verification"
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    Number of tasks to generate
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                                    className="w-32 px-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!prompt.trim() || isGenerating}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating tasks...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate Tasks
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Generated Tasks Preview */}
                    {generatedTasks.length > 0 && (
                        <div className="space-y-4">
                            {aiMessage && (
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">{aiMessage}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {selectedTasks.size} of {generatedTasks.length} tasks selected
                                </p>
                                <button
                                    onClick={() => {
                                        if (selectedTasks.size === generatedTasks.length) {
                                            setSelectedTasks(new Set());
                                        } else {
                                            setSelectedTasks(new Set(generatedTasks.map((_, idx) => idx)));
                                        }
                                    }}
                                    className="text-sm text-primary hover:underline"
                                >
                                    {selectedTasks.size === generatedTasks.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>

                            <div className="space-y-3">
                                {generatedTasks.map((task, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => toggleTask(idx)}
                                        className={cn(
                                            "p-4 border rounded-lg cursor-pointer transition-all",
                                            selectedTasks.has(idx)
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0",
                                                    selectedTasks.has(idx)
                                                        ? "bg-primary border-primary"
                                                        : "border-muted-foreground"
                                                )}
                                            >
                                                {selectedTasks.has(idx) && (
                                                    <Check className="w-3 h-3 text-primary-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-medium text-foreground">{task.title}</h3>
                                                    <span
                                                        className={cn(
                                                            "px-2 py-0.5 text-xs font-medium rounded border",
                                                            priorityColors[task.priority]
                                                        )}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                    {task.column_name && (
                                                        <span className="px-2 py-0.5 text-xs text-muted-foreground bg-muted rounded">
                                                            {task.column_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{task.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setGeneratedTasks([]);
                                        setSelectedTasks(new Set());
                                        setAiMessage("");
                                    }}
                                    className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                                >
                                    Start Over
                                </button>
                                <button
                                    onClick={handleCreateTasks}
                                    disabled={selectedTasks.size === 0 || isCreating}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating {selectedTasks.size} tasks...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Create {selectedTasks.size} Tasks
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
