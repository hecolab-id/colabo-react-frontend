"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import { Building2, ArrowRight, Users, Loader2 } from "lucide-react";
import axios from "axios";
import { createTeam } from "@/lib/api";

export default function OnboardingPage() {
    const router = useRouter();
    const { user, teams, loadTeams, addTeam, isTeamsLoading, hasLoadedTeams } = useStore();
    const [view, setView] = useState<"welcome" | "create">("welcome");
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    // If user has teams, redirect to dashboard
    useEffect(() => {
        if (hasLoadedTeams && teams.length > 0) {
            router.push("/dashboard");
        }
    }, [hasLoadedTeams, teams, router]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMessage(null);
        try {
            const newTeam = await createTeam(name);
            addTeam(newTeam);
            router.push("/dashboard");
        } catch (error: unknown) {
            console.error("Failed to create team:", error);
            if (axios.isAxiosError<{ message?: string }>(error)) {
                setErrorMessage(error.response?.data?.message || "Failed to create team. Please try again.");
            } else {
                setErrorMessage("Failed to create team. Please try again.");
            }
        } finally {
            setCreating(false);
        }
    };

    if (isTeamsLoading || !hasLoadedTeams) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking your workspace...</span>
                </div>
            </div>
        );
    }

    if (view === "create") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg p-8">
                    <button
                        onClick={() => setView("welcome")}
                        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center"
                    >
                        ← Back
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                            <span className="text-xl font-bold">+</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Create your first team</h1>
                        <p className="text-muted-foreground">Name your workspace to get started</p>
                    </div>

                    <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Team Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                required
                                autoFocus
                            />
                        </div>
                        {errorMessage && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={creating || !name.trim()}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                            {creating ? "Creating..." : "Create Team & Continue"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                        Welcome to Colabo{user?.name ? `, ${user.name}` : ""}!
                    </h1>
                    <p className="text-muted-foreground">
                        Get started by creating or joining a team
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => setView("create")}
                        className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Create a new team
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Start fresh with your own workspace
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl opacity-60 cursor-not-allowed">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-foreground">
                                Join an existing team
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Use an invite link from your team admin
                            </p>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
