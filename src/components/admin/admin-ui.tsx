"use client";

import { ReactNode } from "react";
import { AdminOverview } from "@/lib/types";

const USD_TO_IDR = 16250;

export function Panel({
    eyebrow,
    title,
    subtitle,
    children,
}: {
    eyebrow: string;
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[30px] border border-white/75 bg-white/76 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-6">
            <div className="mb-5 space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
                <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            {children}
        </section>
    );
}

export function HeroStat({
    label,
    value,
    meta,
    tone,
}: {
    label: string;
    value: string;
    meta: string;
    tone: "revenue" | "neutral" | "alert" | "calm";
}) {
    const toneMap = {
        revenue: "border-[#b8adff]/18 bg-[linear-gradient(180deg,rgba(184,173,255,0.18),rgba(255,255,255,0.82))]",
        neutral: "border-white/75 bg-white/72",
        alert: "border-[#d56f6f]/18 bg-[linear-gradient(180deg,rgba(213,111,111,0.16),rgba(255,255,255,0.84))]",
        calm: "border-[#6eb6c7]/18 bg-[linear-gradient(180deg,rgba(110,182,199,0.16),rgba(255,255,255,0.84))]",
    };

    return (
        <div className={`rounded-[24px] border p-4 ${toneMap[tone]}`}>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
            <p className="mt-3 font-space-grotesk text-3xl font-bold text-slate-950 [font-variant-numeric:tabular-nums]">{value}</p>
            <p className="mt-2 text-sm text-slate-500">{meta}</p>
        </div>
    );
}

export function SummaryCard({
    title,
    value,
    meta,
    tone,
}: {
    title: string;
    value: string;
    meta: string;
    tone: "revenue" | "cool" | "neutral" | "calm";
}) {
    const toneMap = {
        revenue: "border-[#b8adff]/18 bg-[linear-gradient(180deg,rgba(184,173,255,0.14),rgba(255,255,255,0.88))]",
        cool: "border-[#6eb6c7]/18 bg-[linear-gradient(180deg,rgba(110,182,199,0.14),rgba(255,255,255,0.88))]",
        neutral: "border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.94))]",
        calm: "border-[#7db8a7]/18 bg-[linear-gradient(180deg,rgba(125,184,167,0.14),rgba(255,255,255,0.88))]",
    };

    return (
        <div className={`rounded-[26px] border p-5 ${toneMap[tone]}`}>
            <p className="text-sm text-slate-600">{title}</p>
            <p className="mt-3 font-space-grotesk text-3xl font-bold text-slate-950 [font-variant-numeric:tabular-nums] md:text-4xl">{value}</p>
            <p className="mt-2 text-sm text-slate-500">{meta}</p>
        </div>
    );
}

export function StatusPill({
    tone,
    label,
}: {
    tone: "calm" | "alert" | "revenue" | "slate";
    label: string;
}) {
    const tones = {
        calm: "border-[#7db8a7]/20 bg-[#7db8a7]/10 text-[#2f7a63]",
        alert: "border-[#d56f6f]/20 bg-[#d56f6f]/10 text-[#b34242]",
        revenue: "border-[#b8adff]/20 bg-[#b8adff]/10 text-[#5947d6]",
        slate: "border-white/80 bg-white/72 text-slate-700",
    };

    return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}

export function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[20px] border border-white/75 bg-white/70 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-slate-950 [font-variant-numeric:tabular-nums] md:text-lg">{value}</p>
        </div>
    );
}

export function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
    return (
        <div className={`rounded-[24px] border border-dashed border-black/8 bg-white/60 text-center text-sm text-slate-500 ${compact ? "px-4 py-6" : "px-5 py-10"}`}>
            {message}
        </div>
    );
}

export function SearchField({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-[18px] border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#6eb6c7]/40"
        />
    );
}

export function PaginationControls({
    page,
    totalPages,
    totalItems,
    label,
    onChange,
}: {
    page: number;
    totalPages: number;
    totalItems: number;
    label: string;
    onChange: (page: number) => void;
}) {
    const safeTotalPages = Math.max(totalPages, 1);

    return (
        <div className="flex flex-col gap-3 rounded-[20px] border border-white/8 bg-[#0d1423] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
                Showing page {page} of {safeTotalPages} for {formatNumber(totalItems)} {label}
            </p>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => onChange(Math.min(safeTotalPages, page + 1))}
                    disabled={page >= safeTotalPages}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm text-slate-600">{label}</span>
            <input
                name={label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                autoComplete="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-[20px] border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none transition focus:border-[#6eb6c7]/40"
            />
        </label>
    );
}

export function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm text-slate-600">{label}</span>
            <input
                type="number"
                name={label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                inputMode="decimal"
                autoComplete="off"
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full rounded-[20px] border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none transition focus:border-[#6eb6c7]/40"
            />
        </label>
    );
}

export function DualBarChart({ data }: { data: AdminOverview["daily_registrations"] }) {
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.users, item.teams]));

    return (
        <div>
            <div className="mb-4 flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6eb6c7]" />
                    Users
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7db8a7]" />
                    Teams
                </span>
            </div>
            <div className="flex h-64 items-end gap-2 overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1423] px-3 pb-4 pt-8">
                {data.map((item) => (
                    <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="flex h-48 items-end gap-1.5">
                            <div className="w-2.5 rounded-t-full bg-[#6eb6c7]" style={{ height: `${(item.users / maxValue) * 100}%` }} />
                            <div className="w-2.5 rounded-t-full bg-[#7db8a7]" style={{ height: `${(item.teams / maxValue) * 100}%` }} />
                        </div>
                        <span className="truncate text-[10px] text-slate-500">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DualLineChart({ data }: { data: AdminOverview["monthly_registrations"] }) {
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.users, item.teams]));
    const buildPath = (key: "users" | "teams") =>
        data
            .map((point, index) => {
                const x = (index / Math.max(data.length - 1, 1)) * 100;
                const y = 100 - ((point[key] || 0) / maxValue) * 100;
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

    return (
        <div>
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1423] p-4">
                <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible">
                    <path d={buildPath("users")} fill="none" stroke="#6eb6c7" strokeWidth="2.4" />
                    <path d={buildPath("teams")} fill="none" stroke="#7db8a7" strokeWidth="2.4" />
                </svg>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] text-slate-500 sm:grid-cols-6 md:grid-cols-12">
                {data.map((point) => (
                    <span key={point.label} className="truncate">
                        {point.label}
                    </span>
                ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6eb6c7]" />
                    Users
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7db8a7]" />
                    Teams
                </span>
            </div>
        </div>
    );
}

export function StackedTrend({
    primary,
    secondary,
    primaryLabel,
    secondaryLabel,
}: {
    primary: { label: string; value: number }[];
    secondary: { label: string; value: number }[];
    primaryLabel: string;
    secondaryLabel: string;
}) {
    const maxValue = Math.max(1, ...primary.map((point) => point.value), ...secondary.map((point) => point.value));
    const buildPath = (points: { label: string; value: number }[]) =>
        points
            .map((point, index) => {
                const x = (index / Math.max(points.length - 1, 1)) * 100;
                const y = 100 - (point.value / maxValue) * 100;
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

    return (
        <div>
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1423] p-4">
                <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible">
                    <path d={buildPath(primary)} fill="none" stroke="#b8adff" strokeWidth="2.6" />
                    <path d={buildPath(secondary)} fill="none" stroke="#6eb6c7" strokeWidth="2.6" />
                </svg>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] text-slate-500 sm:grid-cols-6 md:grid-cols-12">
                {primary.map((point) => (
                    <span key={point.label} className="truncate">
                        {point.label}
                    </span>
                ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#b8adff]" />
                    {primaryLabel}
                </span>
                <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6eb6c7]" />
                    {secondaryLabel}
                </span>
            </div>
        </div>
    );
}

export function DonutSplit({ free, paid }: { free: number; paid: number }) {
    const total = Math.max(free + paid, 1);
    const freePercentage = (free / total) * 100;
    const paidPercentage = 100 - freePercentage;

    return (
        <div className="flex flex-col items-center gap-6 py-4">
            <div
                className="grid h-48 w-48 place-items-center rounded-full"
                style={{
                    background: `conic-gradient(#b8adff 0 ${paidPercentage}%, #6eb6c7 ${paidPercentage}% 100%)`,
                }}
            >
                <div className="grid h-[136px] w-[136px] place-items-center rounded-full bg-[#0d1423] text-center">
                    <div>
                        <div className="text-3xl font-bold text-white [font-variant-numeric:tabular-nums]">{total}</div>
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Teams</div>
                    </div>
                </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
                <Metric label={`Paid ${paidPercentage.toFixed(0)}%`} value={formatNumber(paid)} />
                <Metric label={`Free ${freePercentage.toFixed(0)}%`} value={formatNumber(free)} />
            </div>
        </div>
    );
}

export function QuotaChart({ data }: { data: AdminOverview["quota_usage_trend"] }) {
    const maxValue = Math.max(1, ...data.flatMap((item) => [item.ai_tokens, item.whatsapp_messages]));

    return (
        <div className="space-y-4">
            {data.map((point) => (
                <div key={point.label} className="rounded-[22px] border border-white/8 bg-[#0d1423] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>{point.label}</span>
                        <span>
                            {formatCompactNumber(point.ai_tokens)} AI - {formatCompactNumber(point.whatsapp_messages)} WA
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full bg-[#6eb6c7]" style={{ width: `${(point.ai_tokens / maxValue) * 100}%` }} />
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full bg-[#7db8a7]" style={{ width: `${(point.whatsapp_messages / maxValue) * 100}%` }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function BarList({ items }: { items: { label: string; value: number }[] }) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="space-y-4">
            {items.length === 0 ? (
                <EmptyState message="Project distribution will appear here once teams create projects." compact />
            ) : (
                items.map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-white/8 bg-[#0d1423] p-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                            <span className="truncate">{item.label}</span>
                            <span className="[font-variant-numeric:tabular-nums]">{item.value}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#6eb6c7] to-[#b8adff]" style={{ width: `${(item.value / max) * 100}%` }} />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export function toDisplayIdr(value: number, currency = "USD") {
    if (!value) return 0;
    return currency.toUpperCase() === "IDR" ? value : value * USD_TO_IDR;
}

export function formatCurrencyIdr(value: number, currency = "USD") {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(toDisplayIdr(value, currency));
}

export function formatDate(value?: string) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function formatNumber(value: number) {
    return new Intl.NumberFormat("id-ID").format(value || 0);
}

export function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("id-ID", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value || 0);
}
