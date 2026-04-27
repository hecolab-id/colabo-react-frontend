import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteBrowserPushSubscription,
    getBrowserPushSettings,
    saveBrowserPushSubscription,
    sendBrowserPushTest,
    updateBrowserPushSettings,
} from "@/lib/api";
import { BrowserPushSubscriptionInput } from "@/lib/types";

export const browserPushKeys = {
    all: ["browser-push"] as const,
    settings: () => [...browserPushKeys.all, "settings"] as const,
};

export function useBrowserPushSettings() {
    return useQuery({
        queryKey: browserPushKeys.settings(),
        queryFn: getBrowserPushSettings,
    });
}

export function useUpdateBrowserPushSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { is_enabled: boolean }) => updateBrowserPushSettings(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: browserPushKeys.settings() });
        },
    });
}

export function useSaveBrowserPushSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: BrowserPushSubscriptionInput) => saveBrowserPushSubscription(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: browserPushKeys.settings() });
        },
    });
}

export function useDeleteBrowserPushSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (endpoint: string) => deleteBrowserPushSubscription(endpoint),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: browserPushKeys.settings() });
        },
    });
}

export function useSendBrowserPushTest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendBrowserPushTest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: browserPushKeys.settings() });
        },
    });
}
