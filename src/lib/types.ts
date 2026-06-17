export type User = {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    verified_email?: boolean;
    is_super_admin?: boolean;
    status?: string;
    created_at?: string;
    updated_at?: string;
    roles?: Role[];
    timezone?: string;
};

export type MessengerPlatform = "TELEGRAM" | "WHATSAPP";
export type MessengerScheduleFrequency = "DAILY" | "WEEKLY";
export type MessengerScheduleWeekday =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export type Role = {
    id: string;
    name: string;
    permissions: Permission[];
};

export type Permission = {
    id: string;
    name: string;
    guard_name: string;
};

export type AuthResponse = {
    tokens: {
        access: {
            token: string;
            expires: string;
        };
        refresh: {
            token: string;
            expires: string;
        };
    };
    user: User;
    impersonation?: AdminImpersonationState;
};

export type Team = {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    owner?: User;
    members?: User[];
    projects?: Project[];
    created_at?: string;
    role?: string; // Client-side or derived
    logo_url?: string;
    description?: string;
    plan?: Plan;
    usage?: TeamUsage;
    subscription?: Subscription;
    messenger_policy?: TeamMessengerPolicy;
};

export type MessengerConnection = {
    id: string;
    user_id: string;
    platform: MessengerPlatform;
    platform_user_id?: string;
    platform_chat_id?: string;
    platform_handle?: string;
    phone_number?: string;
    is_verified: boolean;
    last_seen_at?: string;
    created_at?: string;
    updated_at?: string;
};

export type EmailReminderKind = "weekly_task";

export type EmailReminderPreference = {
    id: string;
    user_id: string;
    kind: EmailReminderKind;
    enabled: boolean;
    day_of_week: number; // ISO weekday: 1 = Monday .. 7 = Sunday
    hour_local: number;  // 0..23 in `timezone`
    timezone: string;    // IANA, e.g. "Asia/Jakarta"
    last_sent_at?: string | null;
    created_at: string;
    updated_at: string;
};

export type EmailReminderUpdate = Partial<{
    enabled: boolean;
    day_of_week: number;
    hour_local: number;
    timezone: string;
}>;

export type NotificationPreference = {
    id: string;
    user_id: string;
    platform: MessengerPlatform;
    is_enabled: boolean;
    daily_digest_enabled: boolean;
    overdue_alert_enabled: boolean;
    inactivity_alert_enabled: boolean;
    project_risk_enabled: boolean;
    schedule_frequency: MessengerScheduleFrequency;
    scheduled_weekday?: MessengerScheduleWeekday | null;
    scheduled_time_local: string;
    timezone: string;
    weekend_enabled: boolean;
    dnd_start?: string | null;
    dnd_end?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type TeamMessengerPolicy = {
    id: string;
    team_id: string;
    weekend_enabled: boolean;
    inactivity_alert_enabled: boolean;
    project_risk_enabled: boolean;
    schedule_frequency: MessengerScheduleFrequency;
    scheduled_weekday?: MessengerScheduleWeekday | null;
    scheduled_time_local: string;
    timezone: string;
    created_at?: string;
    updated_at?: string;
};

export type MessengerLinkToken = {
    code: string;
    expires_at: string;
    deep_link?: string;
    platform: MessengerPlatform;
};

export type Plan = {
    id: string;
    name: string;
    max_projects: number;
    max_members: number;
    max_storage_mb: number;
    max_file_size_mb?: number;
    max_tasks_per_project?: number;
    ai_generations_per_month?: number;
    ai_tokens_per_month?: number;
    price_per_user: number;
    is_per_seat: boolean;
    created_at?: string;
};

export type TeamUsage = {
    team_id: string;
    projects_count: number;
    members_count: number;
    storage_used_bytes: number;
    ai_generations_used: number;
    ai_tokens_used: number;
    plan?: Plan; // Added this
};

export type Subscription = {
    id: string;
    status: string; // SUBSCRIPTION, PENDING, CANCELLED, EXPIRED
    xendit_plan_id?: string;
    current_period_end?: string;
};

export type DashboardActionBucketId =
    | "needs_attention"
    | "due_soon"
    | "blocked"
    | "ready_to_resume";

export type DashboardActionSeverity = "critical" | "warning" | "stable" | "neutral";

export type DashboardActionItem = {
    id: string;
    title: string;
    href: string;
    bucket: DashboardActionBucketId;
    severity: DashboardActionSeverity;
    reason: string;
    projectName?: string;
    projectCode?: string;
    statusLabel?: string;
    dueAt?: string | null;
};

export type DashboardRecommendedAction = {
    title: string;
    description: string;
    reason: string;
    href: string;
    ctaLabel: string;
    severity: DashboardActionSeverity;
};

export type DashboardHealthMetric = {
    id: string;
    label: string;
    value: number;
    suffix?: string;
    tone: DashboardActionSeverity;
    context: string;
};

export type DashboardProjectSummary = {
    id: string;
    name: string;
    key: string;
    href: string;
    taskCount: number;
    completedCount: number;
    activeTaskCount: number;
    completionRate: number;
    note: string;
    createdAt?: string;
};

export type DashboardOverview = {
    workspace: {
        teamId?: string;
        teamName: string;
        teamSlug?: string;
        teamCount: number;
        isOwner: boolean;
    };
    recommendedAction: DashboardRecommendedAction;
    actionBuckets: Record<DashboardActionBucketId, DashboardActionItem[]>;
    healthMetrics: DashboardHealthMetric[];
    projects: DashboardProjectSummary[];
    utility: {
        showUpgrade: boolean;
        upgradeHref?: string;
        planName?: string;
        projectsUsed?: number;
        projectsLimit?: number;
        membersUsed?: number;
        membersLimit?: number;
    };
};

export type AdminImpersonationState = {
    is_active: boolean;
    actor_user_id?: string;
    actor_name?: string;
};

export type AdminUserRow = {
    id: string;
    name: string;
    email: string;
    join_date: string;
    active_status: string;
    is_super_admin: boolean;
    roles: string[];
};

export type AdminTeamRow = {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
    total_members: number;
    project_count: number;
    current_plan_id?: string;
    current_plan_name?: string;
    subscription_id?: string;
    subscription_status?: string;
    whatsapp_status: string;
    monthly_ai_tokens_used: number;
    monthly_whatsapp_messages: number;
    created_at: string;
};

export type AdminProjectRow = {
    id: string;
    name: string;
    key: string;
    slug: string;
    team_id: string;
    team_name: string;
    task_count: number;
    completed_count: number;
    created_at: string;
};

export type AdminProjectBreakdownRow = {
    team_id: string;
    team_name: string;
    project_count: number;
};

export type AdminPaymentTransaction = {
    id: string;
    team_id: string;
    team_name: string;
    plan_id?: string;
    plan_name?: string;
    provider: string;
    provider_transaction_id: string;
    status: string;
    amount: number;
    currency: string;
    occurred_at: string;
    billing_period_start?: string;
    billing_period_end?: string;
    webhook_event?: string;
};

export type AdminPlan = {
    id: string;
    name: string;
    max_projects: number;
    max_members: number;
    max_storage_mb: number;
    max_file_size_mb: number;
    max_tasks_per_project: number;
    ai_generations_per_month: number;
    ai_tokens_per_month: number;
    price_per_user: number;
    is_per_seat: boolean;
    created_at: string;
};

export type AdminTrendPoint = {
    label: string;
    value: number;
};

export type AdminDualTrendPoint = {
    label: string;
    users: number;
    teams: number;
};

export type AdminQuotaTrendPoint = {
    label: string;
    ai_tokens: number;
    whatsapp_messages: number;
};

// AI Usage Report (Phase 3 of AI Usage Report feature).
// Backend serializes UUIDs as strings, time.Time as ISO 8601, nullable IDs
// as null, and aggregated token counts as plain numbers (zero-filled rather
// than nullable at the aggregate level).

export type AdminAIUsageFeature =
    | "BRAIN_CHAT"
    | "GENERATE_TASKS"
    | "QUERY_INTENT"
    | "MESSENGER_ASSISTANT"
    | "WEEKLY_SUMMARY"
    | "TITLE_REFINE";

export type AdminAIUsageSummary = {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_calls: number;
    unique_teams: number;
    unique_users: number;

    top_team_id: string | null;
    top_team: string;

    top_user_id: string | null;
    top_user: string;
    top_user_email: string;

    top_feature: AdminAIUsageFeature | "";

    from: string; // ISO 8601
    to: string;   // ISO 8601
};

export type AdminAIUsageTeamRow = {
    team_id: string;
    team_name: string;
    team_slug: string;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    call_count: number;
    last_used_at: string | null;
};

export type AdminAIUsageUserRow = {
    user_id: string;
    user_name: string;
    user_email: string;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    call_count: number;
    last_used_at: string | null;
};

export type AdminAIUsageFeatureRow = {
    feature: AdminAIUsageFeature;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    call_count: number;
    avg_tokens_per_call: number;
};

export type AdminAIUsageGranularity = "hour" | "day";

export type AdminAIUsageFeatureBreakdown = {
    total: number;
    prompt: number;
    completion: number;
};

export type AdminAIUsageTimeseriesPoint = {
    bucket: string; // "YYYY-MM-DD" (day) or "YYYY-MM-DDTHH" (hour) in Asia/Jakarta wall-clock
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_calls: number;
    by_feature: Record<AdminAIUsageFeature, AdminAIUsageFeatureBreakdown>;
};

export type AdminAIUsageTimeseries = {
    granularity: AdminAIUsageGranularity;
    points: AdminAIUsageTimeseriesPoint[];
    from: string;
    to: string;
};

export type AdminOverview = {
    total_active_users: number;
    total_active_projects: number;
    total_revenue_this_month: number;
    total_projects: number;
    projects_by_team: AdminProjectBreakdownRow[];
    daily_registrations: AdminDualTrendPoint[];
    monthly_registrations: AdminDualTrendPoint[];
    mrr_trend: AdminTrendPoint[];
    revenue_trend: AdminTrendPoint[];
    free_vs_paid_ratio: {
        free: number;
        paid: number;
    };
    quota_usage_trend: AdminQuotaTrendPoint[];
};

export type AdminListMeta = {
    total: number;
    page: number;
    page_size: number;
};

export type AdminListResponse<T> = {
    items: T[];
    meta: AdminListMeta;
};

export type AdminEmailReminderDailyPoint = {
    date: string; // YYYY-MM-DD (Asia/Jakarta)
    sent: number;
    skipped: number;
    failed: number;
};

export type AdminEmailReminderSummary = {
    total_users: number;
    total_preferences: number;
    enabled_count: number;
    disabled_count: number;
    missing_count: number;
    sent_this_week: number;
    sent_7d: number;
    skipped_7d: number;
    failed_7d: number;
    last_sent_at: string | null;
    daily: AdminEmailReminderDailyPoint[];
};

export type AdminEmailReminderLogStatus = "sent" | "skipped" | "failed";

export type AdminEmailReminderLogRow = {
    id: string;
    user_id: string;
    user_name: string;
    recipient_email: string;
    kind: string;
    status: AdminEmailReminderLogStatus;
    task_count: number;
    error_message: string | null;
    created_at: string;
};

export type AdminEmailReminderRecipientState = "enabled" | "disabled" | "missing";

export type AdminEmailReminderRecipientRow = {
    user_id: string;
    user_name: string;
    user_email: string;
    state: AdminEmailReminderRecipientState;
    day_of_week: number | null;
    hour_local: number | null;
    timezone: string | null;
    last_sent_at: string | null;
    created_at: string | null;
};

export type AdminSessionSnapshot = {
    user: User;
    accessToken: string;
    refreshToken: string;
};

export type Project = {
    id: string;
    name: string;
    slug: string;
    key: string;
    description?: string;
    is_private?: boolean;
    team_id: string;
    team?: Team;
    task_count: number;
    completed_count: number;
    members?: User[];
    created_at?: string;
    updated_at?: string;
};

export type ProjectDocumentKind = "file" | "link";

export type ProjectDocument = {
    id: string;
    project_id: string;
    name: string;
    url: string;
    kind: ProjectDocumentKind;
    mime_type?: string;
    size_bytes?: number;
    uploaded_by_id: string;
    uploaded_by?: User;
    created_at?: string;
    updated_at?: string;
};

export type ProjectMeetingNote = {
    id: string;
    project_id: string;
    meeting_at: string;
    content: string;
    created_by_id: string;
    created_by?: User;
    updated_by_id: string;
    updated_by?: User;
    created_at?: string;
    updated_at?: string;
};

export type WeeklyProjectSummaryStatus = "PENDING" | "COMPLETED" | "FAILED";

export type WeeklyProjectSummaryContent = {
    executive_summary: string;
    team_contributions?: string[];
    completed_work?: string[];
    in_progress_work?: string[];
    risks_blockers?: string[];
    next_steps?: string[];
};

export type WeeklyProjectSummary = {
    id: string;
    team_id: string;
    project_id: string;
    period_start: string;
    period_end: string;
    status: WeeklyProjectSummaryStatus;
    summary_json: WeeklyProjectSummaryContent;
    summary_text: string;
    generated_at?: string;
    emailed_at?: string;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
};

export type Column = {
    id: string;
    project_id: string;
    name: string;
    color: string;
    order: number;
    is_default: boolean;
    type?: 'default' | 'in_progress' | 'done';
    created_at?: string;
    updated_at?: string;
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BACKLOG';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Label = {
    id: string;
    team_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
};

export type Task = {
    id: string;
    project_id: string;
    project?: Project;
    title: string;
    description: string;
    status: TaskStatus; // Legacy, use column_id for new implementations
    priority: TaskPriority;
    position: number;
    assignee_id?: string | null;
    assignee?: User;
    column_id?: string;
    column?: Column;
    start_date?: string | null;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    comments?: Comment[];
    attachments?: string[];
    checklists?: Checklist[];
    labels?: Label[];
    comments_count?: number;
};

export type Checklist = {
    id: string;
    task_id: string;
    title: string;
    items: ChecklistItem[];
    created_at: string;
    updated_at: string;
};

export type ChecklistItem = {
    id: string;
    checklist_id: string;
    content: string;
    is_done: boolean;
    position: number;
    created_at: string;
    updated_at: string;
};

export type TaskLite = Task;

export type Comment = {
    id: string;
    content: string;
    task_id: string;
    user_id: string;
    created_at: string;
    mentions?: CommentMention[];
    user: User;
};

export type LinkPreview = {
    url: string;
    title: string;
    description?: string;
    image?: string;
    site_name?: string;
    favicon?: string;
};

export type CommentMention = {
    id: string;
    comment_id: string;
    user_id: string;
    display_text: string;
    start: number;
    end: number;
    user: User;
};

export type Notification = {
    id: string;
    user_id: string;
    title: string;
    content: string; // unified from message
    read_at?: string;
    created_at: string;
    type?: NotificationType;
    resource_id?: string;
    data?: unknown;
    link?: string;
};

export type NotificationType = 'assignment' | 'comment' | 'mention' | 'system' | string;

export type NotificationLinkData = {
    task_id?: string;
    project_slug?: string;
    team_slug?: string;
};

export type BrowserPushSettings = {
    is_enabled: boolean;
    has_subscription: boolean;
    is_configured: boolean;
    vapid_public_key: string;
    last_test_sent_at?: string;
    next_test_available_at?: string;
};

export type BrowserPushSubscriptionInput = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    user_agent?: string;
};

export type ActivityLog = {
    id: string;
    task_id: string;
    user_id: string;
    user: User;
    action_type: string;
    old_value: string;
    new_value: string;
    metadata?: ActivityMetadata;
    created_at: string;
};

export type ActivityMetadata = {
    task_title?: string;
    project_id?: string;
    project_name?: string;
    project_slug?: string;
    from_column_id?: string;
    from_column_name?: string;
    to_column_id?: string;
    to_column_name?: string;
    comment_id?: string;
    assignee_user_id?: string;
    assignee_user_name?: string;
};

export type TeamActivityItem = {
    id: string;
    action_type: string;
    message: string;
    actor: {
        id: string;
        name: string;
    };
    task_id: string;
    task_title: string;
    project_id: string;
    project_name: string;
    project_slug: string;
    metadata?: ActivityMetadata;
    created_at: string;
};

export type ActivityInsightTone = "positive" | "attention" | "risk" | "neutral";
export type ActivityOverviewAudience = "leader" | "member";

export type ActivityInsightItem = {
    id: string;
    title: string;
    message: string;
    tone: ActivityInsightTone;
    href?: string;
    project_name?: string;
    task_title?: string;
    supporting_text?: string;
};

export type ActivityInsightSection = {
    id: string;
    title: string;
    description?: string;
    items: ActivityInsightItem[];
};

export type TeamActivityOverview = {
    summary: {
        completed_recently_count: number;
        needs_attention_count: number;
        potential_risk_count: number;
        stalled_count: number;
    };
    start_here: ActivityInsightItem;
    sections: ActivityInsightSection[];
    visibility: {
        show_project_risk: boolean;
        is_personalized: boolean;
        audience: ActivityOverviewAudience;
    };
};

export type PaginatedResult<T> = {
    data: T[];
    page: number;
    limit: number;
    total_pages: number;
    total_results: number;
};

export type ProjectInvite = {
    id: string;
    project_id: string;
    email: string;
    token: string;
    role_id: string;
    inviter_id: string;
    expires_at: string;
    status: string;
    created_at: string;
};

export type TeamInvite = {
    id: string;
    team_id: string;
    email: string;
    token: string;
    role_id: string;
    inviter_id: string;
    expires_at: string;
    status: string;
    created_at: string;
};

export type TeamInvitePreview = {
    token: string;
    team_name: string;
    inviter_name: string;
    email: string;
    expires_at: string;
    status: string;
};
