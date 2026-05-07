import { AdminAIUsageFeature } from "@/lib/types";

export const FEATURE_LABELS: Record<
    AdminAIUsageFeature,
    { label: string; description: string }
> = {
    BRAIN_CHAT: {
        label: "Brain Chat",
        description: "Conversational AI assistant inside projects",
    },
    GENERATE_TASKS: {
        label: "Task Generation",
        description: "Auto-create tasks from a user prompt",
    },
    QUERY_INTENT: {
        label: "Query Intent",
        description: "Internal classifier called before chat reply",
    },
    MESSENGER_ASSISTANT: {
        label: "Messenger Assistant",
        description: "Telegram and WhatsApp bot responses",
    },
};
