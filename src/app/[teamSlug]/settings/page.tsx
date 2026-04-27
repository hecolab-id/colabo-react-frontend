"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/app-link";
import Image from "@/components/app-image";
import { useRouter, useSearchParams } from "@/lib/navigation";
import {
    ArrowRightLeft,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    LogOut,
    Save,
    ShieldAlert,
    Trash2,
    Upload,
} from "lucide-react";
import { PlanPackageDialog } from "@/components/billing/plan-package-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { isPaidSubscription } from "@/lib/billing";
import { deleteTeam } from "@/lib/api";
import {
    useLeaveTeam,
    useTeam,
    useTransferOwnership,
    useUpdateTeam,
    useUploadTeamLogo,
} from "@/lib/hooks/use-team";
import { useBillingPlans, useCancelSubscription, useSubscribe, useUsage } from "@/lib/hooks/use-billing";
import { useTeamMessengerPolicy, useUpdateTeamMessengerPolicy } from "@/lib/hooks/use-messenger";
import { useStore } from "@/lib/store";
import { Plan } from "@/lib/types";

type SettingsTab = "general" | "billing" | "danger";

const weekdayOptions = [
    { value: "MONDAY", label: "Monday" },
    { value: "TUESDAY", label: "Tuesday" },
    { value: "WEDNESDAY", label: "Wednesday" },
    { value: "THURSDAY", label: "Thursday" },
    { value: "FRIDAY", label: "Friday" },
    { value: "SATURDAY", label: "Saturday" },
    { value: "SUNDAY", label: "Sunday" },
];

const numberFormatter = new Intl.NumberFormat();
const storageFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
});

function formatStorage(bytes: number) {
    return `${storageFormatter.format(bytes / 1024 / 1024)} MB`;
}

function UsageMeter({
    label,
    value,
    maxLabel,
    percentage,
    tone,
}: {
    label: string;
    value: string;
    maxLabel: string;
    percentage: number;
    tone: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                    {value} / {maxLabel}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}

function TeamSettingsPageContent({ params }: { params: Promise<{ teamSlug: string }> }) {
    const { teamSlug } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentUser = useStore((state) => state.user);

    const { data: team, isLoading, error, isError } = useTeam(teamSlug);
    const updateTeamMutation = useUpdateTeam(team?.id || "");
    const uploadLogoMutation = useUploadTeamLogo(team?.id || "");
    const leaveTeamMutation = useLeaveTeam(team?.id || "");
    const transferOwnershipMutation = useTransferOwnership(team?.id || "");

    const { data: usage } = useUsage(team?.id || "");
    const { data: billingPlans = [] } = useBillingPlans(team?.id || "");
    const { data: messengerPolicy } = useTeamMessengerPolicy(team?.id || "");
    const subscribeMutation = useSubscribe(team?.id || "");
    const cancelSubscriptionMutation = useCancelSubscription(team?.id || "");
    const updateMessengerPolicyMutation = useUpdateTeamMessengerPolicy(team?.id || "");

    const [activeTab, setActiveTab] = useState<SettingsTab>("general");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [billingLoading, setBillingLoading] = useState(false);
    const [showPlanDialog, setShowPlanDialog] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCancelSubModal, setShowCancelSubModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedNewOwner, setSelectedNewOwner] = useState("");
    const [messengerWeekendEnabled, setMessengerWeekendEnabled] = useState(true);
    const [messengerInactivityAlertEnabled, setMessengerInactivityAlertEnabled] = useState(false);
    const [messengerProjectRiskEnabled, setMessengerProjectRiskEnabled] = useState(false);
    const [messengerScheduleFrequency, setMessengerScheduleFrequency] = useState<"DAILY" | "WEEKLY">("DAILY");
    const [messengerScheduledWeekday, setMessengerScheduledWeekday] = useState<
        "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"
    >("MONDAY");
    const [messengerScheduledTimeLocal, setMessengerScheduledTimeLocal] = useState("09:00");
    const [messengerTimezone, setMessengerTimezone] = useState("Asia/Jakarta");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const teamAccessStatus = (error as { response?: { status?: number } } | undefined)?.response?.status;

    useEffect(() => {
        if (!team) return;
        setName(team.name);
        setDescription(team.description || "");
    }, [team]);

    useEffect(() => {
        if (!messengerPolicy) return;
        setMessengerWeekendEnabled(messengerPolicy.weekend_enabled);
        setMessengerInactivityAlertEnabled(messengerPolicy.inactivity_alert_enabled);
        setMessengerProjectRiskEnabled(messengerPolicy.project_risk_enabled);
        setMessengerScheduleFrequency(messengerPolicy.schedule_frequency ?? "DAILY");
        setMessengerScheduledWeekday((messengerPolicy.scheduled_weekday ?? "MONDAY") as typeof messengerScheduledWeekday);
        setMessengerScheduledTimeLocal(messengerPolicy.scheduled_time_local ?? "09:00");
        setMessengerTimezone(messengerPolicy.timezone ?? "Asia/Jakarta");
    }, [messengerPolicy]);

    useEffect(() => {
        if (!successMessage) return;

        const timeout = window.setTimeout(() => setSuccessMessage(""), 3000);
        return () => window.clearTimeout(timeout);
    }, [successMessage]);

    const isDirty = useMemo(() => {
        if (!team) return false;
        return name !== team.name || description !== (team.description || "");
    }, [description, name, team]);

    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const isOwner = !!currentUser && !!team && currentUser.id === team.owner_id;
    const currentMember = useMemo(
        () => team?.members?.find((member) => member.id === currentUser?.id),
        [currentUser?.id, team?.members]
    );
    const currentMemberRole = currentMember?.roles?.[0]?.name?.toUpperCase() || "";
    const canManageMessengerPolicy = isOwner || currentMemberRole === "OWNER" || currentMemberRole === "ADMIN";
    const currentPlanIsActive = isPaidSubscription(team?.subscription?.status);
    const currentPlan = (team?.plan || usage?.plan) as Plan | undefined;

    useEffect(() => {
        if (billingPlans.length === 0) return;

        const preferredPlan =
            billingPlans.find((plan) => plan.id === selectedPlanId) ||
            billingPlans.find((plan) => currentPlan?.id === plan.id) ||
            billingPlans.find((plan) => plan.price_per_user > 0) ||
            billingPlans[0];

        if (preferredPlan && preferredPlan.id !== selectedPlanId) {
            setSelectedPlanId(preferredPlan.id);
        }
    }, [billingPlans, currentPlan?.id, selectedPlanId]);

    useEffect(() => {
        if (searchParams.get("plans") === "1") {
            setActiveTab("billing");
            setShowPlanDialog(true);
        }
    }, [searchParams]);

    const transferableMembers = useMemo(
        () => (team?.members || []).filter((member) => member.id !== team?.owner_id),
        [team]
    );

    const usageMetrics = useMemo(() => {
        if (!usage) return null;

        return [
            {
                label: "Projects",
                value: numberFormatter.format(usage.projects_count),
                maxLabel: numberFormatter.format(currentPlan?.max_projects || 0),
                percentage: (usage.projects_count / Math.max(currentPlan?.max_projects || 1, 1)) * 100,
                tone: "bg-primary",
            },
            {
                label: "Members",
                value: numberFormatter.format(usage.members_count),
                maxLabel: numberFormatter.format(currentPlan?.max_members || 0),
                percentage: (usage.members_count / Math.max(currentPlan?.max_members || 1, 1)) * 100,
                tone: "bg-sky-500",
            },
            {
                label: "Storage",
                value: formatStorage(usage.storage_used_bytes),
                maxLabel: formatStorage((currentPlan?.max_storage_mb || 0) * 1024 * 1024),
                percentage: (usage.storage_used_bytes / Math.max((currentPlan?.max_storage_mb || 1) * 1024 * 1024, 1)) * 100,
                tone: "bg-orange-500",
            },
            {
                label: "AI Generations",
                value: numberFormatter.format(usage.ai_generations_used),
                maxLabel: numberFormatter.format(currentPlan?.ai_generations_per_month || 0),
                percentage: (usage.ai_generations_used / Math.max(currentPlan?.ai_generations_per_month || 1, 1)) * 100,
                tone: "bg-violet-500",
            },
        ];
    }, [currentPlan, usage]);

    const handleStartUpgrade = async () => {
        if (!team || !selectedPlanId) return;

        setBillingLoading(true);
        try {
            const response = await subscribeMutation.mutateAsync({
                planId: selectedPlanId,
                memberCount: team.members?.length || 1,
            });
            if (response.payment_link_url) {
                window.location.href = response.payment_link_url;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setBillingLoading(false);
        }
    };

    const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!team) return;

        try {
            await updateTeamMutation.mutateAsync({ name, description });
            setSuccessMessage("Team settings saved.");
        } catch (error) {
            console.error("Failed to update team", error);
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await uploadLogoMutation.mutateAsync(file);
            setSuccessMessage("Team logo updated.");
        } catch (error) {
            console.error("Failed to upload logo", error);
        } finally {
            event.target.value = "";
        }
    };

    const handleLeaveTeam = async () => {
        try {
            await leaveTeamMutation.mutateAsync();
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to leave team", error);
        }
    };

    const handleDeleteTeam = async () => {
        if (!team) return;

        try {
            await deleteTeam(team.id);
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to delete team", error);
        }
    };

    const handleTransferOwnership = async () => {
        if (!selectedNewOwner) return;

        try {
            await transferOwnershipMutation.mutateAsync(selectedNewOwner);
            setShowTransferModal(false);
            setSuccessMessage("Ownership transferred.");
        } catch (error) {
            console.error("Failed to transfer ownership", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading team settings…
            </div>
        );
    }

    if (isError && (teamAccessStatus === 403 || teamAccessStatus === 404 || !team)) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Team not found.
            </div>
        );
    }

    if (!team) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Team not found.
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
                <h1 className="text-2xl font-semibold text-foreground">Owner access only</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                    Team settings and billing controls are only available to the workspace owner.
                </p>
                <Link
                    href={`/${team.slug}`}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                    Back to workspace
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="transition hover:text-foreground">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <Link href={`/${team.slug}`} className="transition hover:text-foreground">
                    {team.name}
                </Link>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">Settings</span>
            </div>

            <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-slate-50 p-6 shadow-sm md:p-8">
                <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_360px]">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                            <ShieldAlert className="h-3.5 w-3.5 text-slate-900" aria-hidden="true" />
                            Team Control Center
                        </div>

                        <div className="space-y-3">
                            <h1 className="max-w-3xl text-balance font-space-grotesk text-[32px] font-semibold tracking-tight text-slate-900 md:text-[40px]">
                                Settings for {team.name}
                            </h1>
                            <p className="max-w-2xl text-[15px] leading-relaxed text-slate-500 md:text-base">
                                Manage workspace identity, billing, and team-level controls from one place. Keep this page focused on configuration, not day-to-day project work.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 pt-2">
                            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
                                <div className="mb-3 text-[12px] font-medium uppercase tracking-wide text-slate-400">Members</div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">
                                    {numberFormatter.format(team.members?.length || 0)}
                                </div>
                                <p className="mt-1 text-[13px] text-slate-500">People with access to this workspace</p>
                            </div>

                            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
                                <div className="mb-3 text-[12px] font-medium uppercase tracking-wide text-slate-400">Plan</div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">
                                    {currentPlan?.name || (currentPlanIsActive ? "Paid" : "Free")}
                                </div>
                                <p className="mt-1 text-[13px] text-slate-500">Current billing tier for this team</p>
                            </div>

                            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
                                <div className="mb-3 text-[12px] font-medium uppercase tracking-wide text-slate-400">Role</div>
                                <div className="text-3xl font-semibold tracking-tight text-slate-900">
                                    {isOwner ? "Owner" : "Member"}
                                </div>
                                <p className="mt-1 text-[13px] text-slate-500">Your current access level in {team.name}</p>
                            </div>
                        </div>
                    </div>

                    <aside className="flex flex-col justify-between rounded-[32px] bg-slate-900 p-8 text-white shadow-xl">
                        <div>
                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Current Plan</p>
                            <h2 className="mt-3 text-[22px] font-semibold text-white tracking-tight">
                                {currentPlanIsActive ? `${currentPlan?.name || "Current"} workspace benefits are active` : "Upgrade for more workspace capacity"}
                            </h2>
                            <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
                                {currentPlanIsActive
                                    ? `Your team can keep growing with the current ${currentPlan?.name || "paid"} package limits.`
                                    : "Review the package options first, then unlock more projects, members, storage, and AI usage when this workspace needs to scale."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (currentPlanIsActive) {
                                    setShowCancelSubModal(true);
                                    return;
                                }
                                setActiveTab("billing");
                                setShowPlanDialog(true);
                            }}
                            disabled={billingLoading}
                            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold text-slate-900 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60"
                        >
                            <CreditCard className="h-[18px] w-[18px]" aria-hidden="true" />
                            {billingLoading
                                ? "Processing…"
                                : currentPlanIsActive
                                    ? "Manage Subscription"
                                    : "Upgrade Plan"}
                        </button>
                    </aside>
                </div>
            </section>

            <div className="flex w-full items-center justify-center mb-8">
                <div className="inline-flex gap-1 p-1 bg-slate-100 border border-black/5 rounded-full shadow-sm" aria-label="Team settings sections">
                    {[
                        { key: "general", label: "General" },
                        { key: "billing", label: "Billing & Usage" },
                        { key: "danger", label: "Danger Zone" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key as SettingsTab)}
                            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-all focus-visible:outline-none ${
                                activeTab === tab.key
                                    ? tab.key === "danger"
                                        ? "bg-red-50 text-red-600 shadow-sm border border-red-100"
                                        : "bg-white text-slate-900 shadow-sm border border-black/5"
                                    : "text-slate-500 hover:text-slate-900 border border-transparent"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "general" && (
                <section className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Workspace Identity</p>
                            <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-900">Logo & presentation</h2>
                            <p className="mt-1.5 text-[14px] text-slate-500">
                                Keep your team instantly recognizable in navigation, settings, and future collaboration surfaces.
                            </p>

                            <div className="mt-8 flex items-start gap-5">
                                <div className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[24px] border border-black/5 bg-slate-100">
                                    {team.logo_url ? (
                                        <Image
                                            src={team.logo_url}
                                            alt={`${team.name} logo`}
                                            width={88}
                                            height={88}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-3xl font-semibold text-slate-400">
                                            {team.name.charAt(0)}
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-[14px] font-semibold text-slate-900">Team Logo</h3>
                                        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                                            Upload a JPG or PNG up to 2 MB. Use a simple mark that stays readable at small sizes.
                                        </p>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        name="team_logo"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/5 bg-slate-50 px-4 text-[13px] font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                                    >
                                        <Upload className="h-4 w-4" aria-hidden="true" />
                                        {uploadLogoMutation.isPending ? "Uploading…" : "Upload New Logo"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">General Settings</p>
                            <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-900">Workspace details</h2>
                            <p className="mt-1.5 text-[14px] text-slate-500">
                                Update the team name and description used across the workspace experience.
                            </p>

                            <form onSubmit={handleUpdate} className="mt-8 space-y-5">
                                <div className="space-y-2.5">
                                    <label htmlFor="team-name" className="text-[13px] font-bold uppercase tracking-wide text-slate-400">
                                        Team Name
                                    </label>
                                    <input
                                        id="team-name"
                                        name="team_name"
                                        type="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Enter the team name…"
                                        className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3.5 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="team-description" className="text-[13px] font-bold uppercase tracking-wide text-slate-400">
                                        Description
                                    </label>
                                    <textarea
                                        id="team-description"
                                        name="team_description"
                                        autoComplete="off"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        rows={4}
                                        placeholder="Describe what this workspace is used for…"
                                        className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3.5 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                                    />
                                </div>

                                <div aria-live="polite" className="min-h-6">
                                    {successMessage && (
                                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-600 shadow-sm">
                                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                            {successMessage}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black/5 mt-4">
                                    <p className="text-[13px] text-slate-500">
                                        Changes stay local until you save them.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={updateTeamMutation.isPending || !isDirty}
                                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" aria-hidden="true" />
                                        {updateTeamMutation.isPending ? "Saving…" : "Save Team Settings"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {canManageMessengerPolicy ? (
                    <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Messenger Policy</p>
                        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-900">Team Messenger Alerts</h2>
                        <p className="mt-1.5 text-[14px] text-slate-500">
                            Atur ringkasan alert terjadwal untuk workspace ini. Section ini mengontrol inactivity summary untuk admin/owner, project risk summary untuk owner/admin, dan apakah alert terjadwal boleh terkirim saat weekend.
                        </p>

                        <form
                            className="mt-6 space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                await updateMessengerPolicyMutation.mutateAsync({
                                    weekend_enabled: messengerWeekendEnabled,
                                    inactivity_alert_enabled: messengerInactivityAlertEnabled,
                                    project_risk_enabled: messengerProjectRiskEnabled,
                                    schedule_frequency: messengerScheduleFrequency,
                                    scheduled_weekday: messengerScheduleFrequency === "WEEKLY" ? messengerScheduledWeekday : null,
                                    scheduled_time_local: messengerScheduledTimeLocal,
                                    timezone: messengerTimezone,
                                });
                                setSuccessMessage("Messenger policy saved.");
                            }}
                        >
                            <div className="grid gap-3 md:grid-cols-3">
                                <label className="space-y-2 text-sm">
                                    <span className="font-semibold text-slate-700">Frequency</span>
                                    <div className="relative">
                                        <select
                                            value={messengerScheduleFrequency}
                                            onChange={(event) => setMessengerScheduleFrequency(event.target.value as "DAILY" | "WEEKLY")}
                                            className="w-full appearance-none rounded-full border-none bg-slate-50 px-4 py-2.5 pr-10 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        >
                                            <option value="DAILY">Daily</option>
                                            <option value="WEEKLY">Weekly</option>
                                        </select>
                                        <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                    </div>
                                </label>
                                {messengerScheduleFrequency === "WEEKLY" ? (
                                    <label className="space-y-2 text-sm">
                                        <span className="font-semibold text-slate-700">Weekday</span>
                                        <div className="relative">
                                            <select
                                                value={messengerScheduledWeekday}
                                                onChange={(event) => setMessengerScheduledWeekday(event.target.value as typeof messengerScheduledWeekday)}
                                                className="w-full appearance-none rounded-full border-none bg-slate-50 px-4 py-2.5 pr-10 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            >
                                                {weekdayOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                        </div>
                                    </label>
                                ) : null}
                                <label className="space-y-2 text-sm">
                                    <span className="font-semibold text-slate-700">Send time</span>
                                    <input
                                        type="time"
                                        value={messengerScheduledTimeLocal}
                                        onChange={(event) => setMessengerScheduledTimeLocal(event.target.value)}
                                        className="w-full rounded-full border-none bg-slate-50 px-4 py-2.5 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </label>
                            </div>

                            <label className="block space-y-2 text-sm">
                                <span className="font-semibold text-slate-700">Timezone</span>
                                <input
                                    type="text"
                                    value={messengerTimezone}
                                    onChange={(event) => setMessengerTimezone(event.target.value)}
                                    className="w-full rounded-full border-none bg-slate-50 px-4 py-2.5 text-[14px] font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="Asia/Jakarta"
                                />
                            </label>

                            <label className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-5 py-4 text-[14px] font-medium text-slate-700">
                                <span>Weekend notifications aktif</span>
                                <input
                                    type="checkbox"
                                    checked={messengerWeekendEnabled}
                                    onChange={(event) => setMessengerWeekendEnabled(event.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-5 py-4 text-[14px] font-medium text-slate-700">
                                <span>Inactivity alert untuk admin/owner</span>
                                <input
                                    type="checkbox"
                                    checked={messengerInactivityAlertEnabled}
                                    onChange={(event) => setMessengerInactivityAlertEnabled(event.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-5 py-4 text-[14px] font-medium text-slate-700">
                                <span>Project risk alert untuk owner</span>
                                <input
                                    type="checkbox"
                                    checked={messengerProjectRiskEnabled}
                                    onChange={(event) => setMessengerProjectRiskEnabled(event.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                                />
                            </label>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updateMessengerPolicyMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <Save className="h-4 w-4" aria-hidden="true" />
                                    {updateMessengerPolicyMutation.isPending ? "Saving…" : "Save Messenger Policy"}
                                </button>
                            </div>
                        </form>
                    </div>
                    ) : null}
                </section>
            )}

            {activeTab === "billing" && (
                <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                    <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Plan Status</p>
                        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-slate-900">Current subscription</h2>
                        <p className="mt-1.5 text-[14px] text-slate-500">
                            Review your current billing tier and decide whether this workspace needs more capacity.
                        </p>

                        <div className="mt-6 rounded-[24px] border border-black/5 bg-slate-50 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                                            currentPlanIsActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                                        }`}>
                                            {currentPlan?.name || (currentPlanIsActive ? "Paid" : "Free")}
                                        </span>
                                        {currentPlanIsActive && (
                                            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
                                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
                                        {currentPlanIsActive
                                            ? `This workspace currently has access to the ${currentPlan?.name || "paid"} package limits.`
                                            : "This workspace is still on the free plan and should review the package options before upgrading."}
                                    </p>
                                </div>
                                <CreditCard className="mt-1 h-6 w-6 text-slate-400" aria-hidden="true" />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (currentPlanIsActive) {
                                    setShowCancelSubModal(true);
                                    return;
                                }
                                setShowPlanDialog(true);
                            }}
                            disabled={billingLoading}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-[14px] font-semibold text-white transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50"
                        >
                            <CreditCard className="h-[18px] w-[18px]" aria-hidden="true" />
                            {billingLoading
                                ? "Processing…"
                                : currentPlanIsActive
                                    ? "Cancel Subscription"
                                    : "Upgrade Plan"}
                        </button>
                    </div>

                    <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">Usage Overview</p>
                        <h2 className="mt-2 flex items-center gap-2 text-[20px] font-semibold tracking-tight text-slate-900">
                            <BarChart3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            Workspace usage
                        </h2>
                        <p className="mt-1.5 text-[14px] text-slate-500">
                            Track how close this team is to its current limits.
                        </p>

                        {usageMetrics ? (
                            <div className="mt-8 space-y-6">
                                {usageMetrics.map((metric) => (
                                    <UsageMeter
                                        key={metric.label}
                                        label={metric.label}
                                        value={metric.value}
                                        maxLabel={metric.maxLabel}
                                        percentage={metric.percentage}
                                        tone={metric.tone}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-8 rounded-[24px] border border-dashed border-black/10 bg-slate-50 px-6 py-14 text-center">
                                <p className="text-[16px] font-semibold text-slate-900">Usage data is not available yet</p>
                                <p className="mt-2 text-[14px] text-slate-500">
                                    Refresh this page after the workspace starts creating projects or adding more members.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <PlanPackageDialog
                isOpen={showPlanDialog}
                plans={billingPlans}
                selectedPlanId={selectedPlanId}
                currentPlanId={currentPlan?.id}
                onClose={() => {
                    setShowPlanDialog(false);
                    if (searchParams.get("plans") === "1") {
                        router.replace(`/${teamSlug}/settings`, { scroll: false });
                    }
                }}
                onConfirm={handleStartUpgrade}
                onSelectPlan={setSelectedPlanId}
                isLoading={billingLoading}
                currentMemberCount={team?.members?.length || 1}
            />

            {activeTab === "danger" && (
                <section className="space-y-6">
                    <div className="rounded-[32px] border border-red-200 bg-red-50 p-8 shadow-sm">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-red-500">Danger Zone</p>
                        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-red-700">High-impact team actions</h2>
                        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-red-600/90">
                            These actions affect access, ownership, or the existence of the workspace itself. Use them carefully and only when you are certain.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-red-600">
                                <LogOut className="h-5 w-5" aria-hidden="true" />
                                <h3 className="text-[18px] font-semibold tracking-tight">Leave Team</h3>
                            </div>
                            <p className="text-[14px] leading-relaxed text-slate-500">
                                Remove your own access to this workspace. You will need a new invite to return.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowLeaveModal(true)}
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-[14px] font-semibold text-red-600 transition-all hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                                Leave Team
                            </button>
                        </div>

                        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-red-600">
                                <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                                <h3 className="text-[18px] font-semibold tracking-tight">Transfer Ownership</h3>
                            </div>
                            <p className="text-[14px] leading-relaxed text-slate-500">
                                Move workspace ownership to another member, then continue as a regular member.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowTransferModal(true)}
                                disabled={!isOwner}
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-[14px] font-semibold text-red-600 transition-all hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Transfer Ownership
                            </button>
                        </div>

                        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-red-600">
                                <Trash2 className="h-5 w-5" aria-hidden="true" />
                                <h3 className="text-[18px] font-semibold tracking-tight">Delete Team</h3>
                            </div>
                            <p className="text-[14px] leading-relaxed text-slate-500">
                                Permanently remove this workspace and all of its projects, tasks, comments, and files.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(true)}
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                                Delete Team
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <ConfirmationDialog
                isOpen={showLeaveModal}
                onCancel={() => setShowLeaveModal(false)}
                title="Leave Team"
                description="Are you sure you want to leave this team? You will lose access to all projects and tasks."
                confirmText="Leave Team"
                variant="danger"
                onConfirm={handleLeaveTeam}
                isLoading={leaveTeamMutation.isPending}
            />

            <ConfirmationDialog
                isOpen={showDeleteModal}
                onCancel={() => setShowDeleteModal(false)}
                title="Delete Team"
                description="Are you very sure? This permanently deletes the team, all projects, columns, tasks, comments, and files. This action cannot be undone."
                confirmText="Delete Permanently"
                variant="danger"
                onConfirm={handleDeleteTeam}
            />

            <ConfirmationDialog
                isOpen={showCancelSubModal}
                onCancel={() => setShowCancelSubModal(false)}
                title="Cancel Subscription"
                description="Are you sure you want to cancel? This workspace will lose Pro benefits at the end of the current billing period."
                confirmText="Cancel Subscription"
                variant="danger"
                onConfirm={async () => {
                    await cancelSubscriptionMutation.mutateAsync();
                    setShowCancelSubModal(false);
                }}
            />

            {showTransferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-2xl overflow-hidden">
                        <h3 className="text-[20px] font-semibold tracking-tight text-slate-900">Transfer Ownership</h3>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
                            Select a new owner for this workspace. Only current members can receive ownership.
                        </p>

                        <div className="mt-6 max-h-[300px] overflow-y-auto rounded-[24px] border border-black/5 bg-slate-50">
                            {transferableMembers.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => setSelectedNewOwner(member.id)}
                                    className={`flex w-full items-center gap-4 p-4 text-left transition-all hover:bg-white border-b border-black/5 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                                        selectedNewOwner === member.id ? "bg-white shadow-sm" : ""
                                    }`}
                                >
                                    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white shadow-sm">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-semibold text-slate-900">{member.name}</p>
                                        <p className="truncate text-[13px] text-slate-500">{member.email}</p>
                                    </div>
                                    {selectedNewOwner === member.id && (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </div>
                                    )}
                                </button>
                            ))}

                            {transferableMembers.length === 0 && (
                                <div className="p-8 text-center text-[14px] text-slate-500">
                                    No other members are available for ownership transfer.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowTransferModal(false)}
                                className="rounded-full px-5 py-2.5 text-[14px] font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleTransferOwnership}
                                disabled={!selectedNewOwner || transferOwnershipMutation.isPending}
                                className="rounded-full bg-slate-900 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline-none"
                            >
                                {transferOwnershipMutation.isPending ? "Transferring…" : "Confirm Transfer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TeamSettingsPage({ params }: { params: Promise<{ teamSlug: string }> }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <TeamSettingsPageContent params={params} />
        </Suspense>
    );
}
