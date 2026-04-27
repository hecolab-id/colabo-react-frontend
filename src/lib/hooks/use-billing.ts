import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    subscribe,
    cancelSubscription,
    getUsage,
    getBillingPlans,
} from "@/lib/api";
import { teamKeys } from "@/lib/hooks/use-team";

export const billingKeys = {
    usage: (teamId: string) => ["billing", "usage", teamId] as const,
    plans: (teamId: string) => ["billing", "plans", teamId] as const,
};

export function useUsage(teamId: string) {
    return useQuery({
        queryKey: billingKeys.usage(teamId),
        queryFn: () => getUsage(teamId),
        enabled: !!teamId
    });
}

export function useBillingPlans(teamId: string) {
    return useQuery({
        queryKey: billingKeys.plans(teamId),
        queryFn: () => getBillingPlans(teamId),
        enabled: !!teamId,
    });
}

export function useSubscribe(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ planId, memberCount }: { planId: string; memberCount: number }) => subscribe(teamId, planId, memberCount),
        onSuccess: () => {
            // Invalidate team to update Plan/Subscription fields
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            queryClient.invalidateQueries({ queryKey: billingKeys.plans(teamId) });
        }
    });
}

export function useCancelSubscription(teamId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => cancelSubscription(teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
        }
    });
}
