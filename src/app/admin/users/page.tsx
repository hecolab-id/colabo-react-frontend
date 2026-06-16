"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { getAdminUsers } from "@/lib/api";
import { useStore } from "@/lib/store";
import { AdminListResponse, AdminUserRow } from "@/lib/types";
import { EmptyState, Metric, PaginationControls, Panel, SearchField, SkeletonRows, StatusPill, formatDate, formatNumber } from "@/components/admin/admin-ui";
import { useAdminQuery } from "@/lib/hooks/use-admin-query";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

const REFRESHING_CLASS = "opacity-60 transition-opacity duration-200";
const STEADY_CLASS = "transition-opacity duration-200";

export default function AdminUsersPage() {
    const router = useRouter();
    const { startImpersonation } = useStore();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
    const pageSize = 12;

    const usersQ = useAdminQuery<AdminListResponse<AdminUserRow>>(
        (signal) => getAdminUsers({ q: query, page, page_size: pageSize }, signal),
        [query, page],
        "Couldn't load users. Retry?",
    );

    const users = usersQ.data?.items ?? [];
    const total = usersQ.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <div className="space-y-4">
            <Panel
                eyebrow="Users"
                title="User and support operations"
                subtitle="Impersonation and account review live on their own page so support workflows do not crowd business monitoring."
            >
                <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search name, email, status, or role" />
                    <Metric label="Matching users" value={formatNumber(total)} />
                </div>

                {usersQ.isInitialLoading ? (
                    <SkeletonRows count={6} rowHeight={64} />
                ) : usersQ.error ? (
                    <EmptyState message={usersQ.error} />
                ) : (
                <div className={usersQ.isRefreshing ? REFRESHING_CLASS : STEADY_CLASS}>
                <div className="hidden lg:block">
                    <div className="overflow-x-auto rounded-[22px]">
                        <table className="w-full min-w-[760px] table-fixed text-sm">
                            <thead className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                                <tr>
                                    <th className="w-[16%] pb-3">Name</th>
                                    <th className="w-[26%] pb-3">Email</th>
                                    <th className="w-[15%] pb-3">Join Date</th>
                                    <th className="w-[12%] pb-3">Status</th>
                                    <th className="w-[16%] pb-3">Roles</th>
                                    <th className="w-[15%] pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/6">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                                            No users match this search yet.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((adminUser) => (
                                        <tr key={adminUser.id} className="text-slate-600">
                                            <td className="truncate py-4 pr-3 font-medium text-slate-950">{adminUser.name}</td>
                                            <td className="truncate py-4 pr-3 text-slate-500">{adminUser.email}</td>
                                            <td className="py-4 pr-3 text-slate-500">{formatDate(adminUser.join_date)}</td>
                                            <td className="py-4">
                                                <StatusPill tone={adminUser.active_status === "ACTIVE" ? "calm" : "alert"} label={adminUser.active_status} />
                                            </td>
                                            <td className="truncate py-4 pr-3 text-slate-500">
                                                {adminUser.roles.join(", ") || (adminUser.is_super_admin ? "Superadmin" : "No roles")}
                                            </td>
                                            <td className="py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setImpersonatingId(adminUser.id);
                                                        try {
                                                            await startImpersonation(adminUser.id);
                                                            router.push("/dashboard");
                                                        } catch (error) {
                                                            console.error(error);
                                                            toast.error("Couldn't log in as this user. Please try again.");
                                                        } finally {
                                                            setImpersonatingId(null);
                                                        }
                                                    }}
                                                    disabled={adminUser.is_super_admin || impersonatingId === adminUser.id}
                                                    aria-label={`Log in as ${adminUser.name}`}
                                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {impersonatingId === adminUser.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                    Log in
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-3 lg:hidden">
                    {users.length === 0 ? (
                        <EmptyState message="No users match this search yet." />
                    ) : (
                        users.map((adminUser) => (
                            <div key={adminUser.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{adminUser.name}</p>
                                        <p className="mt-1 truncate text-sm text-slate-400">{adminUser.email}</p>
                                    </div>
                                    <StatusPill tone={adminUser.active_status === "ACTIVE" ? "calm" : "alert"} label={adminUser.active_status} />
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <Metric label="Joined" value={formatDate(adminUser.join_date)} />
                                    <Metric label="Roles" value={adminUser.roles.join(", ") || (adminUser.is_super_admin ? "Superadmin" : "No roles")} />
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setImpersonatingId(adminUser.id);
                                        try {
                                            await startImpersonation(adminUser.id);
                                            router.push("/dashboard");
                                        } catch (error) {
                                            console.error(error);
                                            toast.error("Couldn't log in as this user. Please try again.");
                                        } finally {
                                            setImpersonatingId(null);
                                        }
                                    }}
                                    disabled={adminUser.is_super_admin || impersonatingId === adminUser.id}
                                    aria-label={`Log in as ${adminUser.name}`}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {impersonatingId === adminUser.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Login as User
                                </button>
                            </div>
                        ))
                    )}
                </div>
                </div>
                )}

                <div className="mt-4">
                    <PaginationControls page={page} totalPages={totalPages} totalItems={total} label="users" onChange={setPage} />
                </div>
            </Panel>
        </div>
    );
}
