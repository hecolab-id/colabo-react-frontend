"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ensureBrowserPushSubscription, isBrowserPushSupported, removeBrowserPushSubscription } from "@/lib/browser-push";
import {
    useBrowserPushSettings,
    useDeleteBrowserPushSubscription,
    useSaveBrowserPushSubscription,
    useSendBrowserPushTest,
    useUpdateBrowserPushSettings,
} from "@/lib/hooks/use-browser-push";
import { useStore } from "@/lib/store";
import { useUpdateProfile } from "@/lib/hooks/use-settings";
import {
    useConnectMessengerPlatform,
    useCreateMessengerLinkToken,
    useDisconnectMessengerPlatform,
    useMessengerConnections,
    useMessengerPreference,
    useUpdateMessengerPreference,
} from "@/lib/hooks/use-messenger";
import { ChevronRight, Save, Loader2 } from "lucide-react";
import Link from "@/components/app-link";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { SettingsField } from "@/components/ui/settings-field";
import { SettingsSection } from "@/components/ui/settings-section";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

const weekdayOptions = [
    { value: "MONDAY", label: "Monday" },
    { value: "TUESDAY", label: "Tuesday" },
    { value: "WEDNESDAY", label: "Wednesday" },
    { value: "THURSDAY", label: "Thursday" },
    { value: "FRIDAY", label: "Friday" },
    { value: "SATURDAY", label: "Saturday" },
    { value: "SUNDAY", label: "Sunday" },
];

const ProfileSchema = Yup.object().shape({
    name: Yup.string().required("Required"),
    email: Yup.string().email("Invalid email").required("Required"),
});

export default function SettingsPage() {
    const { user } = useStore();
    const updateProfile = useUpdateProfile();
    const { data: browserPushSettings } = useBrowserPushSettings();
    const updateBrowserPushSettings = useUpdateBrowserPushSettings();
    const saveBrowserPushSubscription = useSaveBrowserPushSubscription();
    const deleteBrowserPushSubscription = useDeleteBrowserPushSubscription();
    const sendBrowserPushTest = useSendBrowserPushTest();
    const { data: connections } = useMessengerConnections();
    const { data: telegramPreference } = useMessengerPreference("TELEGRAM");
    const { data: whatsAppPreference } = useMessengerPreference("WHATSAPP");
    const connectTelegram = useConnectMessengerPlatform("TELEGRAM");
    const connectWhatsApp = useConnectMessengerPlatform("WHATSAPP");
    const createTelegramLinkToken = useCreateMessengerLinkToken("TELEGRAM");
    const disconnectTelegram = useDisconnectMessengerPlatform("TELEGRAM");
    const disconnectWhatsApp = useDisconnectMessengerPlatform("WHATSAPP");
    const updateTelegramPreference = useUpdateMessengerPreference("TELEGRAM");
    const updateWhatsAppPreference = useUpdateMessengerPreference("WHATSAPP");
    const [telegramConnectCode, setTelegramConnectCode] = useState<string>("");
    const [telegramDeepLink, setTelegramDeepLink] = useState<string>("");
    const [telegramCodeExpiresAt, setTelegramCodeExpiresAt] = useState<string>("");
    const [browserPushTestMessage, setBrowserPushTestMessage] = useState<string>("");
    const [browserPushNow, setBrowserPushNow] = useState(() => Date.now());
    const browserPushSupported = typeof window !== "undefined" && isBrowserPushSupported();
    const browserPushPermission = browserPushSupported ? Notification.permission : "unsupported";
    const browserPushStatusLabel = !browserPushSupported
        ? "Unsupported in this browser"
        : browserPushPermission === "granted"
            ? (browserPushSettings?.has_subscription ? "Enabled on this device" : "Permission granted, device not synced")
            : browserPushPermission === "denied"
                ? "Blocked in browser settings"
                : "Permission not granted yet";
    const isBrowserPushBusy = updateBrowserPushSettings.isPending
        || saveBrowserPushSubscription.isPending
        || deleteBrowserPushSubscription.isPending
        || sendBrowserPushTest.isPending;
    const nextTestAvailableAt = browserPushSettings?.next_test_available_at
        ? new Date(browserPushSettings.next_test_available_at)
        : null;
    const isTestPushCoolingDown = !!nextTestAvailableAt && nextTestAvailableAt.getTime() > browserPushNow;

    useEffect(() => {
        if (!isTestPushCoolingDown) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setBrowserPushNow(Date.now());
        }, 1000);

        return () => window.clearTimeout(timeout);
    }, [browserPushNow, isTestPushCoolingDown]);

    const handleBrowserPushToggle = async () => {
        setBrowserPushTestMessage("");
        const nextEnabled = !(browserPushSettings?.is_enabled ?? true);
        const nextSettings = await updateBrowserPushSettings.mutateAsync({ is_enabled: nextEnabled });

        if (!nextEnabled) {
            const endpoint = await removeBrowserPushSubscription().catch(() => null);
            if (endpoint) {
                await deleteBrowserPushSubscription.mutateAsync(endpoint);
            }
            return;
        }

        if (!browserPushSupported || !nextSettings.is_configured) {
            return;
        }

        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                return;
            }
        }

        if (Notification.permission === "granted" && nextSettings.vapid_public_key) {
            const subscription = await ensureBrowserPushSubscription(nextSettings.vapid_public_key);
            if (subscription) {
                await saveBrowserPushSubscription.mutateAsync(subscription);
            }
        }
    };

    const handleSendTestPush = async () => {
        setBrowserPushTestMessage("");

        try {
            await sendBrowserPushTest.mutateAsync();
            setBrowserPushTestMessage("Test notification sent. Check your browser and system notification center.");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setBrowserPushTestMessage(error.response?.data?.message || "Failed to send test notification.");
                return;
            }

            setBrowserPushTestMessage("Failed to send test notification.");
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-[13px] font-semibold text-slate-500 shadow-sm">
                <Link href="/dashboard" className="transition-colors hover:text-slate-900">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="text-slate-900">Settings</span>
            </div>

            <div className="space-y-8">
                <div className="space-y-3">
                    <h1 className="max-w-3xl text-balance font-space-grotesk text-[32px] font-semibold tracking-tight text-slate-900 md:text-[40px]">
                        Account Settings
                    </h1>
                    <p className="max-w-2xl text-[15px] leading-relaxed text-slate-500 md:text-base">
                        Manage your profile identity, browser notifications, and personal messenger preferences.
                    </p>
                </div>

                {/* Profile Settings */}
                <SettingsSection
                    eyebrow="Identity"
                    title="Profile Settings"
                    description="Keep your workspace identity tidy so every assignment, comment, and notification feels unmistakably yours."
                >
                    <Formik
                        initialValues={{ name: user.name, email: user.email }}
                        validationSchema={ProfileSchema}
                        enableReinitialize
                        onSubmit={async (values) => {
                            await updateProfile.mutateAsync({ userId: user.id, updates: values });
                        }}
                    >
                        {({ isSubmitting, dirty }) => (
                            <Form className="space-y-5">
                                <SettingsField label="Full Name">
                                    <Field as="input" name="name" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                </SettingsField>
                                <SettingsField label="Email Address">
                                    <Field as="input" name="email" type="email" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                </SettingsField>
                                <div className="flex justify-end border-t border-black/5 pt-6">
                                    <Button
                                        type="submit"
                                        disabled={!dirty || isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                                        Save Profile
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </SettingsSection>

                <SettingsSection
                    eyebrow="Alerts"
                    title="Browser Push Notifications"
                    description="Receive browser notifications when you are assigned to a task or mentioned in a comment."
                    action={(
                        <ToggleSwitch
                            checked={browserPushSettings?.is_enabled ?? true}
                            onClick={handleBrowserPushToggle}
                            disabled={isBrowserPushBusy || !browserPushSettings?.is_configured}
                        />
                    )}
                >

                    <div className="rounded-[1.6rem] border border-black/5 bg-slate-50/80 p-5 space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <p className="text-[14px] font-semibold text-slate-900">Status: {browserPushStatusLabel}</p>
                        <p className="text-[13px] text-slate-500">
                            {browserPushSettings?.is_configured
                                ? "Assignments and mentions share one browser-push toggle for this account."
                                : "Browser push is not configured on the server yet. Add the VAPID env vars to enable it."}
                        </p>
                        {browserPushPermission === "denied" && (
                            <Alert variant="danger">
                                <AlertDescription>
                                    Browser permission is blocked. Re-enable notifications in your browser site settings to use this feature again.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed">
                            Send a test notification to this device. You can trigger it once every minute.
                        </p>
                        <Button
                            type="button"
                            onClick={handleSendTestPush}
                            disabled={
                                isBrowserPushBusy
                                || !browserPushSettings?.is_configured
                                || !browserPushSettings?.has_subscription
                                || !(browserPushSettings?.is_enabled ?? true)
                                || browserPushPermission !== "granted"
                                || isTestPushCoolingDown
                            }
                            variant="secondary"
                        >
                            {sendBrowserPushTest.isPending
                                ? "Sending test..."
                                : isTestPushCoolingDown
                                    ? "Try again in 1 minute"
                                    : "Send Test Notification"}
                        </Button>
                    </div>
                    {browserPushTestMessage && (
                        <Alert>
                            <AlertDescription>{browserPushTestMessage}</AlertDescription>
                        </Alert>
                    )}
                </SettingsSection>

                <SettingsSection
                    eyebrow="Integrations"
                    title="Personal Messenger Assistant"
                    description="Hubungkan Telegram atau WhatsApp pribadi Anda lalu atur jam digest, weekend mode, dan quiet hours."
                    contentClassName="space-y-6"
                >

                    {[
                        {
                            platform: "TELEGRAM" as const,
                            title: "Telegram",
                            placeholder: "@username atau chat id",
                            connection: connections?.find((item) => item.platform === "TELEGRAM"),
                            preference: telegramPreference,
                            connectMutation: connectTelegram,
                            disconnectMutation: disconnectTelegram,
                            updatePreferenceMutation: updateTelegramPreference,
                            keyName: "platform_chat_id",
                        },
                        {
                            platform: "WHATSAPP" as const,
                            title: "WhatsApp",
                            placeholder: "62812xxxxxxx",
                            connection: connections?.find((item) => item.platform === "WHATSAPP"),
                            preference: whatsAppPreference,
                            connectMutation: connectWhatsApp,
                            disconnectMutation: disconnectWhatsApp,
                            updatePreferenceMutation: updateWhatsAppPreference,
                            keyName: "phone_number",
                        },
                    ].map((channel) => (
                        <div key={channel.platform} className="space-y-6 rounded-[1.6rem] border border-black/5 bg-slate-50/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-[16px] font-semibold text-slate-900">{channel.title}</h3>
                                    <p className="text-[13px] text-slate-500 mt-1">
                                        {channel.connection ? "Connected to Assistant" : "Belum terhubung"}
                                    </p>
                                </div>
                                {channel.connection ? (
                                    <Button
                                        type="button"
                                        onClick={() => channel.disconnectMutation.mutate()}
                                        disabled={channel.disconnectMutation.isPending}
                                        variant="danger"
                                        size="sm"
                                    >
                                        {channel.disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                                    </Button>
                                ) : null}
                            </div>

                            {!channel.connection ? (
                                channel.platform === "TELEGRAM" ? (
                                    <div className="space-y-4">
                                        <Alert>
                                            <AlertDescription>
                                            Generate kode, lalu kirim atau buka <code className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">/start CODE</code> di bot Telegram Anda untuk menyambungkan akun secara otomatis.
                                            </AlertDescription>
                                        </Alert>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Button
                                                type="button"
                                                onClick={async () => {
                                                    const result = await createTelegramLinkToken.mutateAsync();
                                                    setTelegramConnectCode(result.code);
                                                    setTelegramDeepLink(result.deep_link || "");
                                                    setTelegramCodeExpiresAt(result.expires_at);
                                                }}
                                                disabled={createTelegramLinkToken.isPending}
                                            >
                                                {createTelegramLinkToken.isPending ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    "Generate Connect Code"
                                                )}
                                            </Button>
                                            {telegramDeepLink ? (
                                                <a
                                                    href={telegramDeepLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/5 bg-white px-5 text-[14px] font-semibold text-slate-600 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.22)] transition-all hover:bg-slate-100 hover:text-slate-900"
                                                >
                                                    Open Telegram Bot
                                                </a>
                                            ) : null}
                                        </div>
                                        {telegramConnectCode ? (
                                            <div className="space-y-3 rounded-[1.4rem] border border-white/80 bg-white/86 p-5 text-center shadow-[0_18px_40px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
                                                <div className="text-[12px] uppercase font-bold tracking-wide text-slate-400">Connect code</div>
                                                <div className="font-space-grotesk text-[32px] font-semibold tracking-tight text-slate-900">{telegramConnectCode}</div>
                                                <div className="text-[14px] text-slate-500">Kirim ke bot: <span className="font-mono text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">/start {telegramConnectCode}</span></div>
                                                {telegramCodeExpiresAt ? (
                                                    <div className="text-[12px] text-slate-400">Expires at: {new Date(telegramCodeExpiresAt).toLocaleString()}</div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <Formik
                                        initialValues={{ value: "" }}
                                        onSubmit={async (values, helpers) => {
                                            await channel.connectMutation.mutateAsync(
                                                channel.keyName === "phone_number"
                                                    ? { phone_number: values.value, is_verified: true }
                                                    : { platform_chat_id: values.value, is_verified: true }
                                            );
                                            helpers.resetForm();
                                        }}
                                    >
                                        {({ isSubmitting }) => (
                                            <Form className="flex flex-col sm:flex-row gap-3">
                                                <Field
                                                    name="value"
                                                    placeholder={channel.placeholder}
                                                    className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:flex-1"
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? "Connecting..." : "Connect"}
                                                </Button>
                                            </Form>
                                        )}
                                    </Formik>
                                )
                            ) : (
                                <Formik
                                    enableReinitialize
                                    initialValues={{
                                        is_enabled: channel.preference?.is_enabled ?? true,
                                        daily_digest_enabled: channel.preference?.daily_digest_enabled ?? true,
                                        schedule_frequency: channel.preference?.schedule_frequency ?? "DAILY",
                                        scheduled_weekday: channel.preference?.scheduled_weekday ?? "MONDAY",
                                        weekend_enabled: channel.preference?.weekend_enabled ?? true,
                                        scheduled_time_local: channel.preference?.scheduled_time_local ?? "08:00",
                                        timezone: channel.preference?.timezone ?? "Asia/Jakarta",
                                        dnd_start: channel.preference?.dnd_start ?? "",
                                        dnd_end: channel.preference?.dnd_end ?? "",
                                    }}
                                    onSubmit={async (values) => {
                                        await channel.updatePreferenceMutation.mutateAsync({
                                            ...values,
                                            overdue_alert_enabled: true,
                                            inactivity_alert_enabled: channel.preference?.inactivity_alert_enabled ?? false,
                                            project_risk_enabled: channel.preference?.project_risk_enabled ?? false,
                                            scheduled_weekday: values.schedule_frequency === "WEEKLY" ? values.scheduled_weekday : null,
                                            dnd_start: values.dnd_start || null,
                                            dnd_end: values.dnd_end || null,
                                        });
                                    }}
                                >
                                    {({ isSubmitting, values, setFieldValue }) => (
                                        <Form className="space-y-6 border-t border-black/5 pt-4">
                                            <div className="grid gap-3 md:grid-cols-3">
                                                {[
                                                    ["is_enabled", "Assistant aktif", "Aktifkan ringkasan dan notifikasi personal."],
                                                    ["daily_digest_enabled", "Daily digest", "Kirim rangkuman pekerjaan harian otomatis."],
                                                    ["weekend_enabled", "Weekend aktif", "Tetap izinkan jadwal berjalan di akhir pekan."],
                                                ].map(([field, title, description]) => (
                                                    <div key={field} className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-white/80 bg-white/82 p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)]">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-slate-900">{title}</p>
                                                            <p className="text-xs leading-5 text-slate-500">{description}</p>
                                                        </div>
                                                        <ToggleSwitch
                                                            checked={Boolean(values[field as keyof typeof values])}
                                                            onClick={() => setFieldValue(field, !values[field as keyof typeof values])}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid md:grid-cols-3 gap-4">
                                                <SettingsField label="Frequency">
                                                    <div className="relative">
                                                        <Field as="select" name="schedule_frequency" className="flex h-12 w-full appearance-none rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 pr-10 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                                                            <option value="DAILY">Daily</option>
                                                            <option value="WEEKLY">Weekly</option>
                                                        </Field>
                                                        <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                                    </div>
                                                </SettingsField>
                                                {values.schedule_frequency === "WEEKLY" ? (
                                                    <SettingsField label="Weekday">
                                                        <div className="relative">
                                                            <Field as="select" name="scheduled_weekday" className="flex h-12 w-full appearance-none rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 pr-10 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                                                                {weekdayOptions.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </Field>
                                                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                                        </div>
                                                    </SettingsField>
                                                ) : null}
                                                <SettingsField label="Jam Digest">
                                                    <Field type="time" name="scheduled_time_local" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                                </SettingsField>
                                                <SettingsField label="Timezone">
                                                    <Field name="timezone" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                                </SettingsField>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <SettingsField label="DND Start">
                                                    <Field type="time" name="dnd_start" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                                </SettingsField>
                                                <SettingsField label="DND End">
                                                    <Field type="time" name="dnd_end" className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                                                </SettingsField>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    variant="secondary"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                                                    {isSubmitting ? `Saving ${channel.title}...` : `Save ${channel.title}`}
                                                </Button>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            )}
                        </div>
                    ))}
                </SettingsSection>

            </div>
        </div>
    );
}
