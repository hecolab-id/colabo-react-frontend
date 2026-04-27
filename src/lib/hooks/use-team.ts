import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getTeamBySlug,
    updateTeam,
    createInvite,
    getTeamInvites,
    removeMember,
    getRoles,
    leaveTeam,
    transferOwnership,
    uploadTeamLogo
} from "@/lib/api";
import { Team } from "@/lib/types";

export const teamKeys = {
    all: ["teams"] as const,
    slug: (slug: string) => [...teamKeys.all, "slug", slug] as const,
    invites: (teamId: string) => [...teamKeys.all, "invites", teamId] as const,
    roles: () => ["roles"] as const,
};

export function useTeam(slug: string) {
    return useQuery({
        queryKey: teamKeys.slug(slug),
        queryFn: () => getTeamBySlug(slug),
        enabled: !!slug,
        retry: false,
        refetchOnMount: "always",
    });
}

export function useUpdateTeam(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updates: Partial<Team>) => updateTeam(teamId, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            if (data.slug) {
                queryClient.setQueryData(teamKeys.slug(data.slug), data);
            }
        }
    });
}

export function useCreateInvite(teamId: string) {
    return useMutation({
        mutationFn: (email: string) => createInvite(teamId, email),
    });
}

export function useTeamInvites(teamId: string) {
    return useQuery({
        queryKey: teamKeys.invites(teamId),
        queryFn: () => getTeamInvites(teamId),
        enabled: !!teamId,
    });
}

export function useRemoveMember(teamId: string, slug: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => removeMember(teamId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.slug(slug) });
        }
    });
}

export function useRoles() {
    return useQuery({
        queryKey: teamKeys.roles(),
        queryFn: () => getRoles(),
    });
}

export function useLeaveTeam(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => leaveTeam(teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        }
    });
}

export function useTransferOwnership(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newOwnerId: string) => transferOwnership(teamId, newOwnerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        }
    });
}

export function useUploadTeamLogo(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => uploadTeamLogo(teamId, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: teamKeys.slug(data.slug) });
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        }
    });
}
