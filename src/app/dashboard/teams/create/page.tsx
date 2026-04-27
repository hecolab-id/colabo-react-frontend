"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import { ChevronLeft } from "lucide-react";
import Link from "@/components/app-link";
import { createTeam } from "@/lib/api";

export default function CreateTeamPage() {
    const router = useRouter();
    const addTeam = useStore((state) => state.addTeam);
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const newTeam = await createTeam(name);
            addTeam(newTeam);
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create team:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12">
            <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
            </Link>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg mb-6">
                    <span className="text-2xl">+</span>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">Create a new team</h1>
                <p className="text-muted-foreground mb-8">
                    Teams are where you collaborate with others. You can create multiple teams for different groups or projects.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Team Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp, Engineering, Marketing"
                            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            required
                        />
                        <p className="mt-2 text-xs text-muted-foreground">This is the name of your team. It will be visible to your team members.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !name.trim()}
                        className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                    >
                        {isLoading ? "Creating Team..." : "Create Team"}
                    </button>
                </form>
            </div>
        </div>
    );
}
