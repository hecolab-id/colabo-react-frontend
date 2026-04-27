import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeam, updateUser } from "@/lib/api";
import { Team, User } from "@/lib/types";
import { useStore } from "@/lib/store";

export function useUpdateTeam() {
    const queryClient = useQueryClient();
    const { loadTeams } = useStore();

    return useMutation({
        mutationFn: ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) =>
            updateTeam(teamId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            loadTeams(); // Refresh teams in store
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { refreshUser } = useStore();

    return useMutation({
        mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
            updateUser(userId, updates),
        onSuccess: () => {
            refreshUser(); // Refresh user in store
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}
