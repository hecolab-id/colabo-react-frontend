"use client";

export const NOTIFICATION_PROMPT_INTENT_EVENT = "colabo:notification-prompt-intent";
export const NOTIFICATION_PROMPT_SNOOZED_UNTIL_KEY = "colabo-push-soft-prompt-snoozed-until";
export const NOTIFICATION_PROMPT_ACCEPTED_AT_KEY = "colabo-push-soft-prompt-accepted-at";
export const NOTIFICATION_PROMPT_SHOWN_SESSION_KEY = "colabo-push-soft-prompt-shown-session";

export const NOTIFICATION_PROMPT_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export type NotificationPromptReason = "task_created" | "manual";

export function recordNotificationPromptIntent(reason: NotificationPromptReason) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new CustomEvent(NOTIFICATION_PROMPT_INTENT_EVENT, { detail: { reason } }));
}

export function isNotificationSoftPromptSnoozed(now = Date.now()) {
    if (typeof window === "undefined") {
        return true;
    }

    const snoozedUntil = Number(window.localStorage.getItem(NOTIFICATION_PROMPT_SNOOZED_UNTIL_KEY) || "0");
    return snoozedUntil > now;
}

export function snoozeNotificationSoftPrompt(now = Date.now()) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(NOTIFICATION_PROMPT_SNOOZED_UNTIL_KEY, String(now + NOTIFICATION_PROMPT_SNOOZE_MS));
}

export function markNotificationSoftPromptAccepted(now = Date.now()) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(NOTIFICATION_PROMPT_ACCEPTED_AT_KEY, String(now));
    window.sessionStorage.setItem(NOTIFICATION_PROMPT_SHOWN_SESSION_KEY, "true");
}
