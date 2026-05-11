"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import { ChevronLeft, Loader2, UsersRound } from "lucide-react";
import Link from "@/components/app-link";
import { createTeam } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsField } from "@/components/ui/settings-field";

export default function CreateTeamPage() {
    const router = useRouter();
    const addTeam = useStore((state) => state.addTeam);
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || isLoading) {
            return;
        }

        setIsLoading(true);
        setErrorMessage("");
        try {
            const newTeam = await createTeam(trimmedName);
            addTeam(newTeam);
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create team:", error);
            setErrorMessage(
                axios.isAxiosError(error)
                    ? error.response?.data?.message || "Unable to create this team. Please try again."
                    : "Unable to create this team. Please try again.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6 md:py-10">
            <Link
                href="/dashboard"
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                <ChevronLeft className="h-4 w-4" />
                Dashboard
            </Link>

            <section className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/78 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                <div className="border-b border-black/5 px-5 py-5 sm:px-7">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-black/5 bg-primary-dark text-white shadow-[0_14px_30px_rgba(51,35,127,0.22)]">
                            <UsersRound className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
                            <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">
                                Create a new team
                            </h1>
                            <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">
                                Set up a focused workspace for projects, tasks, and members.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 px-5 py-5 sm:px-7 sm:py-7">
                    <SettingsField label="Team Name">
                        <Input
                            id="team-name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setErrorMessage("");
                            }}
                            placeholder="Engineering"
                            autoComplete="organization"
                            disabled={isLoading}
                            required
                        />
                        <p className="text-xs leading-5 text-slate-500">
                            This name appears in navigation, project pages, and member invites.
                        </p>
                    </SettingsField>

                    <div aria-live="polite" className="min-h-6">
                        {errorMessage ? (
                            <p className="rounded-[1rem] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium text-[var(--danger-fg)]">
                                {errorMessage}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-500">
                            You can invite members after the team is created.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                                Cancel
                            </Link>
                            <Button type="submit" size="lg" disabled={isLoading || !name.trim()}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                {isLoading ? "Creating..." : "Create Team"}
                            </Button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    );
}
