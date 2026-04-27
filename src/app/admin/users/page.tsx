"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { getAdminUsers } from "@/lib/api";
import { useStore } from "@/lib/store";
import { AdminUserRow } from "@/lib/types";
import { EmptyState, Metric, PaginationControls, Panel, SearchField, StatusPill, formatDate, formatNumber } from "@/components/admin/admin-ui";

export default function AdminUsersPage() {
    const router = useRouter();
    const { startImpersonation } = useStore();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 12;
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await getAdminUsers({ q: query, page, page_size: pageSize });
                setUsers(response?.items || []);
                setTotal(response?.meta?.total || 0);
            } catch (error) {
                console.error("Failed to load admin users:", error);
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [page, query]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    if (loading) {
        return <div className="rounded-[28px] border border-white/10 bg-[#111827]/60 p-8 text-sm text-slate-300">Loading users.</div>;
    }

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
                                                        await startImpersonation(adminUser.id);
                                                        router.push("/dashboard");
                                                    }}
                                                    disabled={adminUser.is_super_admin}
                                                    aria-label={`Log in as ${adminUser.name}`}
                                                    className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
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
                                        await startImpersonation(adminUser.id);
                                        router.push("/dashboard");
                                    }}
                                    disabled={adminUser.is_super_admin}
                                    aria-label={`Log in as ${adminUser.name}`}
                                    className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Login as User
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4">
                    <PaginationControls page={page} totalPages={totalPages} totalItems={total} label="users" onChange={setPage} />
                </div>
            </Panel>
        </div>
    );
}
