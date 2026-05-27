"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser, setTokens } = useStore();

    useEffect(() => {
        const handleCallback = async () => {
            const errorReason = searchParams.get("error");
            if (errorReason) {
                router.push(`/login?error=${encodeURIComponent(errorReason)}`);
                return;
            }

            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");
            // const accessExpires = searchParams.get("access_expires"); // Not strictly needed for store init currently

            if (accessToken && refreshToken) {
                try {
                    // Update store and API token
                    setTokens(accessToken, refreshToken);

                    // Now fetch user details
                    await refreshUser();

                    router.push("/dashboard");
                } catch (error) {
                    console.error("Google login failed", error);
                    router.push("/login?error=google_auth_failed");
                }
            } else {
                router.push("/login?error=missing_tokens");
            }
        };

        handleCallback();
    }, [searchParams, router, refreshUser, setTokens]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Processing login...</h2>
            <p className="text-muted-foreground">Please wait while we log you in.</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
