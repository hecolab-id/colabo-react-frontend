import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWeeklyTaskReminderPreference, updateWeeklyTaskReminderPreference } from "@/lib/api";
import { EmailReminderPreference, EmailReminderUpdate } from "@/lib/types";

const queryKey = ["users", "me", "email-reminders", "weekly-task"] as const;

export function useWeeklyTaskReminderPreference() {
    return useQuery<EmailReminderPreference>({
        queryKey,
        queryFn: getWeeklyTaskReminderPreference,
        staleTime: 60_000,
    });
}

export function useUpdateWeeklyTaskReminderPreference() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EmailReminderUpdate) => updateWeeklyTaskReminderPreference(input),
        onSuccess: (data) => {
            queryClient.setQueryData(queryKey, data);
        },
    });
}

// Detect the browser IANA timezone (e.g. "Asia/Jakarta") and, if it differs
// from what the server has for this user, fire a silent PATCH so the cron
// matches the user's actual zone. Runs at most once per mount, after the
// preference loads.
export function useAutoSyncReminderTimezone(pref: EmailReminderPreference | undefined) {
    const updateMutation = useUpdateWeeklyTaskReminderPreference();

    useEffect(() => {
        if (!pref) return;
        const browserTz = detectBrowserTimezone();
        if (!browserTz || browserTz === pref.timezone) return;
        updateMutation.mutate({ timezone: browserTz });
    }, [pref, updateMutation]);
}

export function detectBrowserTimezone(): string {
    if (typeof Intl === "undefined") return "";
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
        return "";
    }
}
