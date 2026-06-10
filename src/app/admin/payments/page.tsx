"use client";

import { useEffect, useState } from "react";
import { getAdminPayments } from "@/lib/api";
import { AdminListResponse, AdminPaymentTransaction } from "@/lib/types";
import { EmptyState, Metric, PaginationControls, Panel, SearchField, SkeletonRows, StatusPill, formatCurrencyIdr, formatDate, formatNumber } from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

type PaymentFilter = "ALL" | "SUCCESS" | "FAILED" | "PENDING";

export default function AdminPaymentsPage() {
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const paymentsQ = useAdminQuery<AdminListResponse<AdminPaymentTransaction>>(
        (signal) =>
            getAdminPayments(
                { q: query, page, page_size: pageSize, status: paymentFilter },
                signal,
            ),
        [query, page, paymentFilter],
        "Couldn't load payments. Retry?",
    );

    const payments = paymentsQ.data?.items ?? [];
    const total = paymentsQ.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-4">
            <Panel
                eyebrow="Payments"
                title="Transaction history"
                subtitle="Payments are separated from broader revenue analytics so owners can review operational billing status without visual overload."
            >
                <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search team, plan, provider, transaction, or status" />
                    <Metric label="Matching rows" value={formatNumber(total)} />
                </div>

                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {(["ALL", "SUCCESS", "FAILED", "PENDING"] as const).map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => {
                                setPaymentFilter(status);
                                setPage(1);
                            }}
                            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition md:min-h-0 ${
                                paymentFilter === status
                                    ? "bg-[#b8adff] text-[#111827]"
                                    : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {paymentsQ.isInitialLoading ? (
                    <SkeletonRows count={6} rowHeight={64} />
                ) : paymentsQ.error ? (
                    <EmptyState message={paymentsQ.error} />
                ) : (
                <div className={paymentsQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}>
                <div className="hidden lg:block">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] text-sm">
                            <thead className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                                <tr>
                                    <th className="pb-3">Team</th>
                                    <th className="pb-3">Plan</th>
                                    <th className="pb-3">Transaction</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Occurred</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/6">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                                            No payment transactions match this filter or search yet.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="text-slate-200">
                                            <td className="py-4">{payment.team_name}</td>
                                            <td className="py-4 text-slate-400">{payment.plan_name || "No plan"}</td>
                                            <td className="py-4">
                                                <div className="max-w-[220px] truncate text-white">{payment.provider_transaction_id}</div>
                                                <div className="mt-1 text-xs text-slate-500">{payment.provider}</div>
                                            </td>
                                            <td className="py-4">{formatCurrencyIdr(payment.amount, payment.currency)}</td>
                                            <td className="py-4">
                                                <StatusPill
                                                    tone={payment.status === "SUCCESS" ? "calm" : payment.status === "FAILED" ? "alert" : "revenue"}
                                                    label={payment.status}
                                                />
                                            </td>
                                            <td className="py-4 text-slate-400">{formatDate(payment.occurred_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-3 lg:hidden">
                    {payments.length === 0 ? (
                        <EmptyState message="No payment transactions match this filter or search yet." />
                    ) : (
                        payments.map((payment) => (
                            <div key={payment.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{payment.team_name}</p>
                                        <p className="mt-1 truncate text-sm text-slate-400">{payment.plan_name || "No plan"}</p>
                                    </div>
                                    <StatusPill
                                        tone={payment.status === "SUCCESS" ? "calm" : payment.status === "FAILED" ? "alert" : "revenue"}
                                        label={payment.status}
                                    />
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <Metric label="Amount" value={formatCurrencyIdr(payment.amount, payment.currency)} />
                                    <Metric label="Occurred" value={formatDate(payment.occurred_at)} />
                                </div>
                                <div className="mt-4 rounded-2xl border border-white/8 bg-[#0d1423] p-3">
                                    <p className="truncate text-sm text-white">{payment.provider_transaction_id}</p>
                                    <p className="mt-1 text-xs text-slate-500">{payment.provider}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                </div>
                )}

                <div className="mt-4">
                    <PaginationControls page={page} totalPages={totalPages} totalItems={total} label="payments" onChange={setPage} />
                </div>
            </Panel>
        </div>
    );
}
