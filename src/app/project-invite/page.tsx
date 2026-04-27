"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { resetPassword } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Lock } from "lucide-react";

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
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Invalid Invite Link</h1>
                    <p className="text-muted-foreground">The invite link is missing a token.</p>
                </div>
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
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Account Setup Complete!</h1>
                    <p className="text-muted-foreground">Your password has been set.</p>
                    <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        You have been invited to join
                    </h2>
                    <h1 className="text-3xl font-bold text-foreground">
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
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
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
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
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

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accept & Join <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>

                <p className="text-xs text-center text-muted-foreground">
                    By joining, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}

export default function ProjectInvitePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <InviteContent />
        </Suspense>
    );
}
