"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { acceptTeamInvite, getTeamInvitePreview } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import type { TeamInvitePreview } from "@/lib/types";

export default function TeamInvitePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useStore();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Accepting invitation...");
    const [preview, setPreview] = useState<TeamInvitePreview | null>(null);

    useEffect(() => {
        const accept = async () => {
            if (!params.token || typeof params.token !== "string") {
                setStatus("error");
                setMessage("Invalid invitation link.");
                return;
            }

            let invitePreview: TeamInvitePreview;
            try {
                invitePreview = await getTeamInvitePreview(params.token);
                setPreview(invitePreview);
            } catch (error: unknown) {
                const apiMessage = typeof error === "object" && error !== null && "response" in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
                setStatus("error");
                setMessage(apiMessage || "This invitation link is invalid or has expired.");
                return;
            }

            if (!user) {
                setMessage("Redirecting to login...");
                const search = new URLSearchParams({
                    redirect: `/invites/team/${params.token}`,
                    inviteType: "team",
                    inviteToken: params.token,
                    teamName: invitePreview.team_name,
                    inviterName: invitePreview.inviter_name,
                });
                if (invitePreview.email) {
                    search.set("inviteEmail", invitePreview.email);
                }
                router.push(`/login?${search.toString()}`);
                return;
            }

            try {
                await acceptTeamInvite(params.token);
                setStatus("success");
                setMessage("Invitation accepted! Redirecting to dashboard...");
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } catch (error: unknown) {
                const message = typeof error === "object" && error !== null && "response" in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
                console.error("Failed to accept team invite", error);
                setStatus("error");
                setMessage(message || "Failed to accept invitation. It may have expired.");
            }
        };

        accept();
    }, [params.token, router, user]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl shadow-lg text-center">
                {status === "loading" && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <h2 className="text-xl font-semibold text-foreground">Accepting Invitation</h2>
                        {preview?.team_name ? (
                            <p className="text-sm text-foreground">
                                You&apos;ve been invited to join <span className="font-semibold">{preview.team_name}</span>
                                {preview.inviter_name ? <> by <span className="font-semibold">{preview.inviter_name}</span></> : null}.
                            </p>
                        ) : null}
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}
                {status === "success" && (
                    <div className="flex flex-col items-center gap-4">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <h2 className="text-xl font-semibold text-foreground">Success!</h2>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}
                {status === "error" && (
                    <div className="flex flex-col items-center gap-4">
                        <XCircle className="w-12 h-12 text-red-500" />
                        <h2 className="text-xl font-semibold text-foreground">Error</h2>
                        <p className="text-muted-foreground">{message}</p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
