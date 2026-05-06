"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Bell, Bot, Camera, Check, ChevronDown, ChevronRight, Loader2, Save, Search, UserRound, X } from "lucide-react";
import Link from "@/components/app-link";
import { getInitials } from "@/components/ui/avatar";
import { Formik, Form, Field } from "formik";
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from "@headlessui/react";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsField } from "@/components/ui/settings-field";
import { SettingsSection } from "@/components/ui/settings-section";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const weekdayOptions = [
    { value: "MONDAY", label: "Monday" },
    { value: "TUESDAY", label: "Tuesday" },
    { value: "WEDNESDAY", label: "Wednesday" },
    { value: "THURSDAY", label: "Thursday" },
    { value: "FRIDAY", label: "Friday" },
    { value: "SATURDAY", label: "Saturday" },
    { value: "SUNDAY", label: "Sunday" },
];

const avatarMaxSizeBytes = 1024 * 1024;
const avatarMaxDataUrlLength = 1_500_000;
const avatarAcceptedFormats = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const ProfileSchema = Yup.object().shape({
    name: Yup.string().required("Required"),
    email: Yup.string().email("Invalid email").required("Required"),
    avatar_url: Yup.string().max(avatarMaxDataUrlLength, "Avatar terlalu besar").optional(),
});

const WhatsAppConnectSchema = Yup.object().shape({
    value: Yup.string()
        .matches(/^\d+$/, "Gunakan angka saja, contoh 62812xxxxxxx")
        .min(8, "Nomor terlalu pendek")
        .max(16, "Nomor terlalu panjang")
        .required("Nomor WhatsApp wajib diisi"),
});

type SettingsTab = "profile" | "notifications" | "messenger";
type SelectOption = { value: string; label: string };

const settingsTabs = [
    {
        id: "profile",
        label: "Profile",
        description: "Identity and account details",
        icon: UserRound,
    },
    {
        id: "notifications",
        label: "Notifications",
        description: "Browser push settings",
        icon: Bell,
    },
    {
        id: "messenger",
        label: "Messenger",
        description: "Telegram and WhatsApp assistant",
        icon: Bot,
    },
] satisfies Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: typeof UserRound;
}>;

const frequencyOptions: SelectOption[] = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
];

const defaultTimezoneOptions = [
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
    "Asia/Singapore",
    "Asia/Kuala_Lumpur",
    "Asia/Bangkok",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "UTC",
];

function sanitizeDigits(value: string) {
    return value.replace(/\D/g, "");
}


function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function formatTimezoneLabel(timezone: string) {
    return timezone.replace(/_/g, " ");
}

function getTimezoneOptions() {
    const browserTimezones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
        ? Intl.supportedValuesOf("timeZone")
        : [];

    return Array.from(new Set([...defaultTimezoneOptions, ...browserTimezones]))
        .sort((left, right) => {
            if (left === "Asia/Jakarta") return -1;
            if (right === "Asia/Jakarta") return 1;
            return left.localeCompare(right);
        })
        .map((timezone) => ({
            value: timezone,
            label: formatTimezoneLabel(timezone),
        }));
}

function SettingsSelect({
    value,
    onChange,
    options,
    placeholder = "Select option",
}: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
}) {
    const selectedOption = options.find((option) => option.value === value);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <ListboxButton className="relative flex h-12 w-full items-center rounded-[1.15rem] border border-black/6 bg-white/75 px-4 py-3 pr-11 text-left text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] hover:bg-white focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                    <span className={cn("block truncate", !selectedOption && "text-slate-400")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                </ListboxButton>
                <ListboxOptions
                    transition
                    className="absolute z-[80] mt-2 max-h-64 w-full overflow-auto rounded-[1.2rem] border border-slate-200/80 bg-white p-1.5 text-[14px] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.5)] outline-none transition duration-150 ease-out data-[closed]:translate-y-1 data-[closed]:opacity-0"
                >
                    {options.map((option) => (
                        <ListboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus }) =>
                                cn(
                                    "relative cursor-pointer select-none rounded-[0.95rem] py-2.5 pl-9 pr-3 font-medium transition-colors",
                                    focus ? "bg-primary/8 text-slate-950" : "text-slate-600",
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span className="block truncate">{option.label}</span>
                                    {selected ? (
                                        <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
                                    ) : null}
                                </>
                            )}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}

function TimezoneSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
}) {
    const [query, setQuery] = useState("");
    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = query.trim()
        ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()) || option.value.toLowerCase().includes(query.toLowerCase()))
        : options;

    return (
        <Combobox
            value={value}
            onChange={(nextValue) => {
                if (nextValue) {
                    onChange(nextValue);
                }
            }}
            onClose={() => setQuery("")}
        >
            <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <ComboboxInput
                    className="flex h-12 w-full rounded-[1.15rem] border border-black/6 bg-white/75 py-3 pl-10 pr-11 text-[15px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 hover:bg-white focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    displayValue={(timezone: string) => options.find((option) => option.value === timezone)?.label ?? selectedOption?.label ?? formatTimezoneLabel(value)}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari timezone"
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </ComboboxButton>
                <ComboboxOptions
                    transition
                    className="absolute z-[80] mt-2 max-h-64 w-full overflow-auto rounded-[1.2rem] border border-slate-200/80 bg-white p-1.5 text-[14px] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.5)] outline-none transition duration-150 ease-out empty:hidden data-[closed]:translate-y-1 data-[closed]:opacity-0"
                >
                    {filteredOptions.map((option) => (
                        <ComboboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus }) =>
                                cn(
                                    "relative cursor-pointer select-none rounded-[0.95rem] py-2.5 pl-9 pr-3 font-medium transition-colors",
                                    focus ? "bg-primary/8 text-slate-950" : "text-slate-600",
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span className="block truncate">{option.label}</span>
                                    {selected ? (
                                        <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
                                    ) : null}
                                </>
                            )}
                        </ComboboxOption>
                    ))}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
}

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
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [avatarError, setAvatarError] = useState("");
    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
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
        <div className="max-w-6xl">
            {/* Breadcrumb */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 text-[13px] font-semibold text-slate-500 shadow-sm">
                <Link href="/dashboard" className="transition-colors hover:text-slate-900">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="text-slate-900">Settings</span>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <h1 className="max-w-3xl text-balance font-space-grotesk text-[32px] font-semibold tracking-tight text-slate-900 md:text-[40px]">
                        Account Settings
                    </h1>
                    <p className="max-w-2xl text-[15px] leading-relaxed text-slate-500 md:text-base">
                        Manage your profile identity, browser notifications, and personal messenger preferences.
                    </p>
                </div>

                <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6">
                    <aside className="mb-5 lg:sticky lg:top-24 lg:mb-0">
                        <nav
                            className="flex gap-2 overflow-x-auto rounded-[1.4rem] border border-white/70 bg-white/80 p-2 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.38)] backdrop-blur-2xl lg:flex-col lg:overflow-visible"
                            aria-label="Account settings sections"
                        >
                            {settingsTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex min-w-[11rem] items-center gap-3 rounded-[1.05rem] px-3 py-3 text-left transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 lg:min-w-0",
                                            isActive
                                                ? "bg-slate-950 text-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.7)]"
                                                : "text-slate-600 hover:bg-white hover:text-slate-950",
                                        )}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <span
                                            className={cn(
                                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                                                isActive ? "border-white/15 bg-white/10 text-white" : "border-black/5 bg-slate-50 text-primary",
                                            )}
                                        >
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">{tab.label}</span>
                                            <span className={cn("hidden text-xs leading-5 lg:block", isActive ? "text-white/62" : "text-slate-500")}>
                                                {tab.description}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="min-w-0">
                {/* Profile Settings */}
                {activeTab === "profile" ? (
                <SettingsSection
                    eyebrow="Identity"
                    title="Profile Settings"
                    description="Keep your workspace identity tidy so every assignment, comment, and notification feels unmistakably yours."
                >
                    <Formik
                        initialValues={{ name: user.name, email: user.email, avatar_url: user.avatar_url || "" }}
                        validationSchema={ProfileSchema}
                        enableReinitialize
                        onSubmit={async (values) => {
                            setAvatarError("");
                            await updateProfile.mutateAsync({ userId: user.id, updates: values });
                        }}
                    >
                        {({ errors, isSubmitting, dirty, setFieldValue, values }) => (
                            <Form className="space-y-5">
                                <div className="rounded-[1.4rem] border border-black/5 bg-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/80 bg-primary/10 text-[22px] font-semibold text-primary shadow-[0_18px_42px_-32px_rgba(15,23,42,0.45)]">
                                                {values.avatar_url ? (
                                                    <img src={values.avatar_url} alt={`${values.name || user.name} avatar`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span>{getInitials(values.name || user.name)}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                                                <p className="mt-1 max-w-md text-[13px] leading-5 text-slate-500">
                                                    PNG, JPG, WebP, or GIF. Maksimal 1MB supaya avatar tetap cepat dimuat.
                                                </p>
                                                {(avatarError || errors.avatar_url) ? (
                                                    <p className="mt-2 text-[12px] font-medium text-red-500">{avatarError || errors.avatar_url}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/5 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] transition-colors hover:bg-slate-50">
                                                <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
                                                Upload
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                                    className="sr-only"
                                                    onChange={async (event) => {
                                                        const file = event.target.files?.[0];
                                                        event.target.value = "";
                                                        if (!file) return;

                                                        if (!avatarAcceptedFormats.has(file.type)) {
                                                            setAvatarError("Format harus gambar: PNG, JPG, WebP, atau GIF.");
                                                            return;
                                                        }

                                                        if (file.size > avatarMaxSizeBytes) {
                                                            setAvatarError("Ukuran avatar maksimal 1MB.");
                                                            return;
                                                        }

                                                        try {
                                                            const dataUrl = await readFileAsDataUrl(file);
                                                            setAvatarError("");
                                                            setFieldValue("avatar_url", dataUrl);
                                                        } catch {
                                                            setAvatarError("Gagal membaca file avatar.");
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {values.avatar_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAvatarError("");
                                                        setFieldValue("avatar_url", "");
                                                    }}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/5 bg-white px-4 text-[13px] font-semibold text-slate-500 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] transition-colors hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" aria-hidden="true" />
                                                    Remove
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <SettingsField label="Full Name">
                                    <Field as={Input} name="name" />
                                </SettingsField>
                                <SettingsField label="Email Address">
                                    <Field as={Input} name="email" type="email" />
                                </SettingsField>
                                <div className="flex justify-end border-t border-black/5 pt-6">
                                    <Button
                                        type="submit"
                                        disabled={!dirty || isSubmitting || Boolean(avatarError)}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                                        Save Profile
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </SettingsSection>
                ) : null}

                {activeTab === "notifications" ? (
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
                ) : null}

                {activeTab === "messenger" ? (
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
                                        validationSchema={WhatsAppConnectSchema}
                                        onSubmit={async (values, helpers) => {
                                            const phoneNumber = sanitizeDigits(values.value);
                                            await channel.connectMutation.mutateAsync(
                                                channel.keyName === "phone_number"
                                                    ? { phone_number: phoneNumber, is_verified: true }
                                                    : { platform_chat_id: values.value.trim(), is_verified: true }
                                            );
                                            helpers.resetForm();
                                        }}
                                    >
                                        {({ errors, isSubmitting, setFieldValue, touched, values }) => (
                                            <Form className="space-y-2">
                                                <div className="flex flex-col gap-3 sm:flex-row">
                                                    <Input
                                                        name="value"
                                                        value={values.value}
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        autoComplete="tel"
                                                        placeholder={channel.placeholder}
                                                        className="sm:flex-1"
                                                        onChange={(event) => {
                                                            setFieldValue("value", sanitizeDigits(event.target.value));
                                                        }}
                                                    />
                                                    <Button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? "Connecting..." : "Connect"}
                                                    </Button>
                                                </div>
                                                {touched.value && errors.value ? (
                                                    <p className="px-1 text-[12px] font-medium text-red-500">{errors.value}</p>
                                                ) : (
                                                    <p className="px-1 text-[12px] text-slate-400">Gunakan format angka internasional tanpa spasi, contoh 62812xxxxxxx.</p>
                                                )}
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
                                                    <SettingsSelect
                                                        value={values.schedule_frequency}
                                                        onChange={(value) => setFieldValue("schedule_frequency", value)}
                                                        options={frequencyOptions}
                                                    />
                                                </SettingsField>
                                                {values.schedule_frequency === "WEEKLY" ? (
                                                    <SettingsField label="Weekday">
                                                        <SettingsSelect
                                                            value={values.scheduled_weekday}
                                                            onChange={(value) => setFieldValue("scheduled_weekday", value)}
                                                            options={weekdayOptions}
                                                        />
                                                    </SettingsField>
                                                ) : null}
                                                <SettingsField label="Jam Digest">
                                                    <Field as={Input} type="time" name="scheduled_time_local" />
                                                </SettingsField>
                                                <SettingsField label="Timezone">
                                                    <TimezoneSelect
                                                        value={values.timezone}
                                                        onChange={(value) => setFieldValue("timezone", value)}
                                                        options={timezoneOptions}
                                                    />
                                                </SettingsField>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <SettingsField label="DND Start">
                                                    <Field as={Input} type="time" name="dnd_start" />
                                                </SettingsField>
                                                <SettingsField label="DND End">
                                                    <Field as={Input} type="time" name="dnd_end" />
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
                ) : null}

                    </div>
                </div>
            </div>
        </div>
    );
}
