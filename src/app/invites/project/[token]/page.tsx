"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { acceptProjectInvite } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function ProjectInvitePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useStore();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("Accepting invitation...");

    useEffect(() => {
        const accept = async () => {
            if (!params.token || typeof params.token !== 'string') {
                setStatus('error');
                setMessage("Invalid invitation link.");
                return;
            }

            // Check if user is authenticated
            if (!user) {
                setMessage("Redirecting to login...");
                // Redirect to login with the invite link as the redirect target
                router.push(`/login?redirect=/invites/project/${params.token}`);
                return;
            }

            try {
                await acceptProjectInvite(params.token);
                setStatus('success');
                setMessage("Invitation accepted! Redirecting to dashboard...");
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } catch (error: any) {
                console.error("Failed to accept invite", error);
                setStatus('error');
                setMessage(error.response?.data?.message || "Failed to accept invitation. It may have expired.");
            }
        };

        accept();
    }, [params.token, router, user]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl shadow-lg text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <h2 className="text-xl font-semibold text-foreground">Accepting Invitation</h2>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}
                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <h2 className="text-xl font-semibold text-foreground">Success!</h2>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}
                {status === 'error' && (
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
