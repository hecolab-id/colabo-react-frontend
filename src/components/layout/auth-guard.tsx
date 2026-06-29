"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import { AUTH_EXPIRED_EVENT } from "@/lib/api";

const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/auth/callback",
    "/auth/google",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/offline",
    "/" // Landing page
];

const GUEST_ONLY_PATHS = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password"
];

function getAuthenticatedRedirectPath(verifiedEmail: boolean | undefined) {
    if (!verifiedEmail) {
        return "/verify-request";
    }

    return "/dashboard";
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, accessToken, loadTeams, teams, isTeamsLoading, hasLoadedTeams, logout } = useStore();
    const [checked, setChecked] = useState(false);
    const [hasHydrated, setHasHydrated] = useState(false);
    const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + "?"));
    const isInvitePath =
        pathname.startsWith("/invite/") ||
        pathname.startsWith("/invites/team/") ||
        pathname.startsWith("/invites/project/");
    // Public Progress Page: the share token is the credential, so it must render
    // for logged-out clients (and unverified users) without any auth redirect.
    const isSharePath = pathname.startsWith("/share/");

    // Wait for Zustand to hydrate from localStorage
    useEffect(() => {
        const persist = (useStore as typeof useStore & {
            persist?: {
                hasHydrated?: () => boolean;
                onFinishHydration?: (listener: () => void) => () => void;
            };
        }).persist;

        if (!persist) {
            setHasHydrated(true);
            return;
        }

        const unsubscribe = persist.onFinishHydration?.(() => {
            setHasHydrated(true);
        });

        if (persist.hasHydrated?.()) {
            setHasHydrated(true);
        }

        return unsubscribe;
    }, []);

    useEffect(() => {
        // Wait for hydration before making any auth decisions
        if (!hasHydrated) return;

        const checkAuth = async () => {
            // Special case for invite + public share links - allow them to
            // handle their own auth redirects/logic (or none at all).
            if (isInvitePath || isSharePath) {
                setChecked(true);
                return;
            }

            if (!accessToken) {
                if (isPublicPath) {
                    setChecked(true);
                    return;
                }

                // Not authenticated, redirect to login
                router.replace("/login");
                return;
            }

            if (!user) {
                // Token exists but user not loaded? Store hydration should handle this.
                // If persistent, maybe clear token. For now, wait.
                return;
            }

            // 0. Guest Guard
            if (GUEST_ONLY_PATHS.some(path => pathname === path)) {
                if (user.verified_email && !hasLoadedTeams && !isTeamsLoading) {
                    try {
                        await loadTeams();
                    } catch (error) {
                        console.error("Failed to load teams during guest redirect:", error);
                    }
                }

                router.replace(getAuthenticatedRedirectPath(user.verified_email));
                return;
            }

            if (isPublicPath) {
                setChecked(true);
                return;
            }

            // 1. Email Verification Gate
            if (!user.verified_email) {
                // Allow user to access a "Verify Request" page if we make one
                // For now, redirect to specialized verify-instruction page or just block
                // Let's assume we create a /verify-request page
                if (pathname !== "/verify-request") {
                    router.replace("/verify-request");
                    return;
                }
            } else if (pathname === "/verify-request") {
                // If verified, don't stay on verify-request
                router.replace("/dashboard");
                return;
            }

            // 2. Post-verification workspace loading
            if (user.verified_email) {
                let resolvedTeams = teams;

                if (!hasLoadedTeams) {
                    if (isTeamsLoading) {
                        return;
                    }

                    try {
                        await loadTeams();
                    } catch (error) {
                        console.error("Failed to load teams during auth guard:", error);
                    }

                    resolvedTeams = useStore.getState().teams;
                }

                if (resolvedTeams.length === 0 && pathname !== "/onboarding") {
                    setChecked(true);
                    return;
                }

                if (pathname === "/onboarding") {
                    router.replace("/dashboard");
                    return;
                }
            }

            setChecked(true);
        };

        checkAuth();
    }, [accessToken, hasHydrated, hasLoadedTeams, isInvitePath, isSharePath, isPublicPath, isTeamsLoading, loadTeams, pathname, router, teams, user]);

    useEffect(() => {
        const handleAuthExpired = () => {
            logout();
            setChecked(true);
            if (!pathname.startsWith("/login")) {
                router.replace("/login");
            }
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    }, [logout, pathname, router]);

    if (!checked && !isPublicPath && !isInvitePath && !isSharePath) {
        // Show loading only for protected routes while checking
        // return (
        //    <div className="flex h-screen items-center justify-center bg-background">
        //         <Loader2 className="w-8 h-8 animate-spin text-primary" />
        //    </div>
        // );
        // Actually, returning null avoids flash of content, or user spinner.
        return null;
    }

    return <>{children}</>;
}
