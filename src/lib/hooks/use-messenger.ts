import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    connectMessengerPlatform,
    createMessengerLinkToken,
    disconnectMessengerPlatform,
    getMessengerConnections,
    getMessengerPreference,
    getTeamMessengerPolicy,
    updateMessengerPreference,
    updateTeamMessengerPolicy,
} from "@/lib/api";
import { MessengerPlatform, NotificationPreference, TeamMessengerPolicy } from "@/lib/types";

export const messengerKeys = {
    all: ["messenger"] as const,
    connections: () => [...messengerKeys.all, "connections"] as const,
    preference: (platform: MessengerPlatform) => [...messengerKeys.all, "preference", platform] as const,
    teamPolicy: (teamId: string) => [...messengerKeys.all, "team-policy", teamId] as const,
};

export function useMessengerConnections() {
    return useQuery({
        queryKey: messengerKeys.connections(),
        queryFn: getMessengerConnections,
    });
}

export function useMessengerPreference(platform: MessengerPlatform) {
    return useQuery({
        queryKey: messengerKeys.preference(platform),
        queryFn: () => getMessengerPreference(platform),
    });
}

export function useConnectMessengerPlatform(platform: MessengerPlatform) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Record<string, unknown>) => connectMessengerPlatform(platform, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: messengerKeys.connections() });
            queryClient.invalidateQueries({ queryKey: messengerKeys.preference(platform) });
        },
    });
}

export function useCreateMessengerLinkToken(platform: MessengerPlatform) {
    return useMutation({
        mutationFn: () => createMessengerLinkToken(platform),
    });
}

export function useDisconnectMessengerPlatform(platform: MessengerPlatform) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => disconnectMessengerPlatform(platform),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: messengerKeys.connections() });
            queryClient.invalidateQueries({ queryKey: messengerKeys.preference(platform) });
        },
    });
}

export function useUpdateMessengerPreference(platform: MessengerPlatform) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<NotificationPreference>) => updateMessengerPreference(platform, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: messengerKeys.preference(platform) });
        },
    });
}

export function useTeamMessengerPolicy(teamId: string) {
    return useQuery({
        queryKey: messengerKeys.teamPolicy(teamId),
        queryFn: () => getTeamMessengerPolicy(teamId),
        enabled: !!teamId,
    });
}

export function useUpdateTeamMessengerPolicy(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<TeamMessengerPolicy>) => updateTeamMessengerPolicy(teamId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: messengerKeys.teamPolicy(teamId) });
        },
    });
}
