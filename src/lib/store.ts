import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AdminImpersonationState, AdminSessionSnapshot, User, Team } from "./types";
import { performLogin, performRegister, getTeams, setAccessToken, sendVerificationEmail, getMe, impersonateUser, exitImpersonation } from "./api";

interface AppState {
    // Auth
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;

    // Teams
    teams: Team[];
    currentTeam: Team | null;
    isTeamsLoading: boolean;
    hasLoadedTeams: boolean;
    impersonation: AdminImpersonationState | null;
    adminSession: AdminSessionSnapshot | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setTeam: (team: Team | null) => void;
    addTeam: (team: Team) => void;
    loadTeams: () => Promise<void>;
    refreshUser: () => Promise<void>;
    startImpersonation: (userId: string) => Promise<void>;
    stopImpersonation: () => Promise<void>;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null, // Add refreshToken
            teams: [],
            currentTeam: null,
            isTeamsLoading: false,
            hasLoadedTeams: false,
            impersonation: null,
            adminSession: null,
            isLoading: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const { user, tokens } = await performLogin(email, password);
                    setAccessToken(tokens.access.token);
                    set({
                        user,
                        accessToken: tokens.access.token,
                        refreshToken: tokens.refresh.token, // Store refresh token
                        teams: [],
                        currentTeam: null,
                        isTeamsLoading: true,
                        hasLoadedTeams: false,
                        impersonation: null,
                        adminSession: null,
                        isLoading: false
                    });

                    // Load teams after login
                    const teams = await getTeams();
                    set({
                        teams,
                        currentTeam: teams[0] || null,
                        isTeamsLoading: false,
                        hasLoadedTeams: true,
                    });

                    // Persist manually if needed, but zustand/persist handles it
                } catch (error) {
                    console.error("Login failed:", error);
                    set({ isLoading: false });
                    throw error; // Re-throw to handle UI feedback if needed
                }
            },

            register: async (name: string, email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const { user, tokens } = await performRegister(name, email, password);
                    setAccessToken(tokens.access.token);
                    set({
                        user,
                        accessToken: tokens.access.token,
                        refreshToken: tokens.refresh.token, // Store refresh token
                        impersonation: null,
                        adminSession: null,
                        isLoading: false
                    });

                    // Trigger email verification
                    await sendVerificationEmail().catch(console.error);
                } catch (error) {
                    console.error("Register failed:", error);
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                    const accessToken = get().accessToken;
                    navigator.serviceWorker.ready.then(async (registration) => {
                        const subscription = await registration.pushManager.getSubscription();
                        if (!subscription || !accessToken) {
                            return;
                        }

                        await fetch("/v1/notifications/push-subscriptions", {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ endpoint: subscription.endpoint }),
                        }).catch(() => {
                            // Ignore push subscription cleanup failures during logout.
                        });

                        await subscription.unsubscribe().catch(() => {
                            // Ignore browser unsubscribe failures during logout.
                        });
                    }).catch(() => {
                        // Ignore service worker readiness failures during logout.
                    });

                    navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_AUTH_CACHE" });
                    navigator.serviceWorker.getRegistration().then((registration) => {
                        registration?.active?.postMessage({ type: "CLEAR_AUTH_CACHE" });
                    }).catch(() => {
                        // Ignore cache-clear failures and continue logging out locally.
                    });
                }
                setAccessToken(null);
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    currentTeam: null,
                    teams: [],
                    isTeamsLoading: false,
                    hasLoadedTeams: false,
                    impersonation: null,
                    adminSession: null
                });
            },

            setTokens: (accessToken, refreshToken) => {
                setAccessToken(accessToken);
                set({ accessToken, refreshToken });
            },

            setTeam: (team) => set({ currentTeam: team }),

            addTeam: (team) => {
                const teams = [...get().teams, team];
                set({ teams, currentTeam: team, hasLoadedTeams: true, isTeamsLoading: false });
            },

            loadTeams: async () => {
                set({ isTeamsLoading: true });
                try {
                    const teams = await getTeams();
                    const previousTeam = get().currentTeam;
                    const matchingTeam = previousTeam
                        ? teams.find((team) => team.id === previousTeam.id)
                        : null;

                    set({
                        teams,
                        currentTeam: matchingTeam || teams[0] || null,
                        isTeamsLoading: false,
                        hasLoadedTeams: true,
                    });
                } catch (error) {
                    set({ isTeamsLoading: false, hasLoadedTeams: true });
                    throw error;
                }
            },

            refreshUser: async () => {
                try {
                    const { user, teams, impersonation } = await getMe();
                    set({
                        user,
                        teams: teams || [],
                        currentTeam: teams?.[0] || get().currentTeam,
                        hasLoadedTeams: true,
                        isTeamsLoading: false,
                        impersonation: impersonation || null,
                    });
                } catch (error) {
                    console.error("Failed to refresh user:", error);
                }
            },

            startImpersonation: async (userId: string) => {
                const state = get();
                if (!state.user || !state.accessToken || !state.refreshToken) {
                    throw new Error("Superadmin session is not available.");
                }

                const snapshot: AdminSessionSnapshot = {
                    user: state.user,
                    accessToken: state.accessToken,
                    refreshToken: state.refreshToken,
                };

                const { user, tokens, impersonation } = await impersonateUser(userId);
                setAccessToken(tokens.access.token);
                set({
                    user,
                    accessToken: tokens.access.token,
                    refreshToken: tokens.refresh.token,
                    impersonation: impersonation || null,
                    adminSession: snapshot,
                    teams: [],
                    currentTeam: null,
                    isTeamsLoading: true,
                    hasLoadedTeams: false,
                });

                const teams = await getTeams();
                set({
                    teams,
                    currentTeam: teams[0] || null,
                    isTeamsLoading: false,
                    hasLoadedTeams: true,
                });
            },

            stopImpersonation: async () => {
                const fallbackSession = get().adminSession;

                try {
                    const { user, tokens, impersonation } = await exitImpersonation();
                    setAccessToken(tokens.access.token);
                    set({
                        user,
                        accessToken: tokens.access.token,
                        refreshToken: tokens.refresh.token,
                        impersonation: impersonation || null,
                        adminSession: null,
                        teams: [],
                        currentTeam: null,
                        isTeamsLoading: true,
                        hasLoadedTeams: false,
                    });

                    const teams = await getTeams();
                    set({
                        teams,
                        currentTeam: teams[0] || null,
                        isTeamsLoading: false,
                        hasLoadedTeams: true,
                    });
                } catch (error) {
                    if (!fallbackSession) {
                        throw error;
                    }

                    setAccessToken(fallbackSession.accessToken);
                    set({
                        user: fallbackSession.user,
                        accessToken: fallbackSession.accessToken,
                        refreshToken: fallbackSession.refreshToken,
                        impersonation: null,
                        adminSession: null,
                        isTeamsLoading: true,
                        hasLoadedTeams: false,
                    });
                    const teams = await getTeams();
                    set({
                        teams,
                        currentTeam: teams[0] || null,
                        isTeamsLoading: false,
                        hasLoadedTeams: true,
                    });
                }
            },
        }),
        {
            name: "colabo-store",
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                currentTeam: state.currentTeam,
                impersonation: state.impersonation,
                adminSession: state.adminSession,
            }),
            onRehydrateStorage: () => (state) => {
                // Hydrate the api token when storage loads
                if (state && state.accessToken) {
                    setAccessToken(state.accessToken);
                }
            },
        }
    )
);
