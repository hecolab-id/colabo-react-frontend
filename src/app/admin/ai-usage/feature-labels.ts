import { AdminAIUsageFeature } from "@/lib/types";

// Color palette is hand-picked for distinct hue separation on white panels:
// brand violet (BRAIN_CHAT — dominant feature) plus three Tailwind 500-shade
// hues that pass AA contrast against white at small sizes.
export const FEATURE_LABELS: Record<
    AdminAIUsageFeature,
    { label: string; description: string; color: string }
> = {
    BRAIN_CHAT: {
        label: "Brain Chat",
        description: "Conversational AI assistant inside projects",
        color: "#6d5dfc",
    },
    GENERATE_TASKS: {
        label: "Task Generation",
        description: "Auto-create tasks from a user prompt",
        color: "#f59e0b",
    },
    QUERY_INTENT: {
        label: "Query Intent",
        description: "Internal classifier called before chat reply",
        color: "#06b6d4",
    },
    MESSENGER_ASSISTANT: {
        label: "Messenger Assistant",
        description: "Telegram and WhatsApp bot responses",
        color: "#f43f5e",
    },
};

// Stable rendering order, used both in the daily stack chart and in the
// horizontal feature breakdown so the same color always sits in the same
// vertical position regardless of which feature has the most usage.
export const FEATURE_ORDER: AdminAIUsageFeature[] = [
    "BRAIN_CHAT",
    "GENERATE_TASKS",
    "QUERY_INTENT",
    "MESSENGER_ASSISTANT",
];
