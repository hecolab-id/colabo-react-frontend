"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { resetPassword } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function InviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const projectName = searchParams.get("project_name");
    const inviterName = searchParams.get("inviter_name");

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!token) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
                <Card variant="elevated" padding="lg" className="w-full max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold text-foreground">Invalid Invite Link</h1>
                    <p className="mt-2 text-muted-foreground">The invite link is missing a token.</p>
                </Card>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setStatus("loading");
        setError(null);

        try {
            await resetPassword(token, password);
            setStatus("success");
            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to set password. Link may have expired.");
            setStatus("error");
        }
    };

    if (status === "success") {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
                <Card variant="elevated" padding="lg" className="w-full max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold text-foreground">Account Setup Complete!</h1>
                    <p className="mt-2 text-muted-foreground">Your password has been set.</p>
                    <p className="mt-1 text-sm text-muted-foreground">Redirecting to login...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
            <Card variant="elevated" padding="lg" className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        You have been invited to join
                    </h2>
                    <h1 className="break-words text-3xl font-semibold tracking-tight text-foreground">
                        {projectName || "a Project"}
                    </h1>
                </div>

                <div className="py-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-3">
                        {(projectName || "P").charAt(0)}
                    </div>
                    {inviterName && (
                        <p className="text-sm text-muted-foreground">
                            Invited by <span className="font-medium text-foreground">{inviterName}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                            Set your Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-11"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-11"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        size="lg"
                        className="w-full"
                    >
                        {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accept & Join <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground">
                    By joining, you agree to our Terms of Service and Privacy Policy.
                </p>
            </Card>
        </div>
    );
}

export default function ProjectInvitePage() {
    return (
        <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <InviteContent />
        </Suspense>
    );
}
