"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { getInvite, joinTeam, setAccessToken } from "@/lib/api";
import { useStore } from "@/lib/store";
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "@/components/app-link";

export default function InvitePage() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const { user } = useStore();
    const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
    const [inviteData, setInviteData] = useState<{ team: { name: string }; inviter: { name: string } } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!code) return;

        // Check if user is logged in
        const stored = localStorage.getItem("colabo-store");
        if (stored) {
            try {
                const { state } = JSON.parse(stored);
                if (state.accessToken) {
                    setAccessToken(state.accessToken);
                }
            } catch { }
        }

        getInvite(code)
            .then((data) => {
                setInviteData(data);
                setStatus("valid");
            })
            .catch((err) => {
                console.error(err);
                setStatus("invalid");
                setError(err.response?.data?.message || "Invalid or expired invite code.");
            });
    }, [code]);

    const handleJoin = async () => {
        if (!user) {
            // Redirect to login with return URL
            router.push(`/login?returnUrl=/invite/${code}`);
            return;
        }

        setStatus("loading");
        try {
            await joinTeam(code);
            setStatus("success");
            // Refresh user data/teams usually happens on dashboard load or we can trigger a refetch
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to join team.");
            setStatus("valid"); // Revert to valid so they can try again or see error
        }
    };

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === "invalid") {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Invalid Invite</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <Link href="/dashboard" className="text-primary hover:underline">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Success!</h1>
                    <p className="text-muted-foreground">You have joined the team.</p>
                    <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-8 text-center space-y-6">
                <div className="space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        You have been invited to join
                    </h2>
                    <h1 className="text-3xl font-bold text-foreground">
                        {inviteData?.team.name}
                    </h1>
                </div>

                <div className="py-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-3">
                        {inviteData?.team.name.charAt(0)}
                    </div>
                    {inviteData?.inviter && (
                        <p className="text-sm text-muted-foreground">
                            Invited by <span className="font-medium text-foreground">{inviteData.inviter.name}</span>
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleJoin}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        {user ? "Join Team" : "Login to Join"} <ArrowRight className="w-4 h-4" />
                    </button>
                    {!user && (
                        <p className="text-xs text-muted-foreground">
                            You need an account to join. <Link href={`/register?returnUrl=/invite/${code}`} className="text-primary hover:underline">Sign up</Link>
                        </p>
                    )}
                    {user && (
                        <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground">
                            Cancel
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
