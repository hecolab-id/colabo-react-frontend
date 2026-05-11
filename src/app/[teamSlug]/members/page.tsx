"use client";

import { use } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "@/components/app-link";
import { useRouter } from "@/lib/navigation";
import { Menu, Transition } from "@headlessui/react";
import {
    AlertCircle,
    ArrowRight,
    ChevronRight,
    Crown,
    LogOut,
    Mail,
    MoreHorizontal,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users2,
} from "lucide-react";
import { InviteMemberModal } from "@/components/modals/invite-member-modal";
import { useUsage } from "@/lib/hooks/use-billing";
import { useTeam, useRemoveMember } from "@/lib/hooks/use-team";
import { leaveTeam, updateMemberRole, getRoles } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Role, User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export default function MembersPage({ params }: { params: Promise<{ teamSlug: string }> }) {
    const { teamSlug } = use(params);
    const { data: team, isLoading, refetch, error, isError } = useTeam(teamSlug);
    const { data: usage } = useUsage(team?.id || "");
    const removeMemberMutation = useRemoveMember(team?.id || "", teamSlug);
    const { user } = useStore();
    const router = useRouter();

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [roleTargetId, setRoleTargetId] = useState<string | null>(null);

    const currentMember = team?.members?.find((member) => member.id === user?.id);
    const hasAdminPermission = currentMember?.roles?.some((role) =>
        role.permissions?.some((permission) => permission.name === "teams:update")
    ) || team?.owner_id === user?.id;
    const canChangeRoles = currentMember?.roles?.some((role) =>
        role.permissions?.some((permission) => permission.name === "members:update_role")
    ) || team?.owner_id === user?.id;

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const roles = await getRoles();
                setAllRoles(roles);
            } catch (error) {
                console.error("Failed to fetch roles", error);
            }
        };

        fetchRoles();
    }, []);

    const members = useMemo(() => team?.members ?? [], [team?.members]);
    const owner = members.find((member) => member.id === team?.owner_id);
    const seatsUsed = usage?.members_count ?? members.length;
    const seatsLimit = usage?.plan?.max_members;
    const seatsLeft = typeof seatsLimit === "number" ? Math.max(seatsLimit - seatsUsed, 0) : null;
    const roleSummary = useMemo(() => {
        return members.reduce<Record<string, number>>((acc, member) => {
            member.roles?.forEach((role) => {
                acc[role.name] = (acc[role.name] || 0) + 1;
            });
            return acc;
        }, {});
    }, [members]);

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;

        try {
            await removeMemberMutation.mutateAsync(memberToRemove.id);
            setMemberToRemove(null);
        } catch (error) {
            console.error("Failed to remove member", error);
        }
    };

    const handleRoleChange = async (memberId: string, newRoleId: string) => {
        if (!team) return;

        setRoleTargetId(memberId);
        try {
            await updateMemberRole(team.id, memberId, newRoleId);
            await refetch();
        } catch (error: unknown) {
            console.error("Failed to update role", error);
            const message =
                error instanceof Error ? error.message : "Failed to update member role.";
            alert(message);
        } finally {
            setRoleTargetId(null);
        }
    };

    const handleLeaveTeam = async () => {
        if (!team) return;

        setIsLeaving(true);
        try {
            await leaveTeam(team.id);
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to leave team", error);
            alert("Failed to leave team. Please try again.");
        } finally {
            setIsLeaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
    }

    const teamAccessStatus = (error as { response?: { status?: number } } | undefined)?.response?.status;

    if (isError && (teamAccessStatus === 403 || teamAccessStatus === 404 || !team)) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Team not found.</div>;
    }

    if (!team) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Team not found.</div>;
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard" className="transition-colors hover:text-foreground">
                    Dashboard
                </Link>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">{team.name}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="text-foreground">Members</span>
            </div>

            <main className="space-y-8">
                <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
                    <div className="border-b border-black/5 bg-slate-50 px-8 py-10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                                    <Users2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Team Access
                                </div>
                                <h1 className="max-w-xl text-[32px] font-semibold tracking-tight text-slate-900 text-balance sm:text-[40px]">
                                    Design the right access layer for the whole team.
                                </h1>
                                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                                    Review seats, role distribution, and invitations in one place. The layout stays operational, but the visual hierarchy now emphasizes access health instead of raw table data.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {hasAdminPermission ? (
                                    <button
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-full bg-primary-dark px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-primary-dark-hover hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <UserPlus className="h-[18px] w-[18px]" aria-hidden="true" />
                                        Invite Member
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowLeaveConfirm(true)}
                                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-[14px] font-semibold text-red-600 transition-colors hover:bg-red-100 active:scale-[0.98]"
                                    >
                                        <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                                        Leave Team
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] bg-white">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[24px] border border-black/5 bg-slate-50 p-5">
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Members</p>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{members.length}</p>
                                <p className="mt-2 text-[13px] text-slate-500">
                                    Including the owner and every assigned role.
                                </p>
                            </div>
                            <div className="rounded-[24px] border border-black/5 bg-slate-50 p-5">
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Seats</p>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                                    {seatsLimit ? `${seatsUsed}/${seatsLimit}` : seatsUsed}
                                </p>
                                <p className="mt-2 text-[13px] text-slate-500">
                                    {seatsLeft !== null ? `${seatsLeft} seats left on this plan.` : "Unlimited seats on this plan."}
                                </p>
                            </div>
                            <div className="rounded-[24px] border border-black/5 bg-slate-50 p-5">
                                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Owner</p>
                                <p className="mt-3 text-[18px] font-semibold tracking-tight text-slate-900 line-clamp-1">{owner?.name || "Unknown"}</p>
                                <p className="mt-2 text-[13px] text-slate-500 line-clamp-1">
                                    {owner?.email || "No owner email available."}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-black/5 bg-slate-50 p-6 flex flex-col justify-center">
                            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Role Mix</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {Object.keys(roleSummary).length > 0 ? (
                                    Object.entries(roleSummary)
                                        .sort(([left], [right]) => left.localeCompare(right))
                                        .map(([roleName, count]) => (
                                            <span
                                                key={roleName}
                                                className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm"
                                            >
                                                <span className="text-slate-900 font-bold">{count}</span>
                                                {roleName}
                                            </span>
                                        ))
                                ) : (
                                    <span className="text-sm text-slate-500">No roles assigned yet.</span>
                                )}
                            </div>
                            <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
                                {hasAdminPermission
                                    ? "Invite members, tune access, and keep the roster balanced without leaving this page."
                                    : "This view is read-only for your account. Team admins can add members and change access."}
                            </p>
                        </div>
                    </div>
                </section>

                {!hasAdminPermission && (
                    <section className="rounded-2xl border border-border bg-[var(--surface-raised)] px-5 py-4 shadow-[0_16px_32px_-30px_rgb(var(--shadow-color)/0.3)]">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">Read-Only Access</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    Contact a team admin or owner to invite new members or update role permissions.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-[32px] border border-black/5 bg-white shadow-sm p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-[24px] font-semibold tracking-tight text-slate-900">Roster</h2>
                            <p className="mt-1 text-[15px] text-slate-500">
                                A clearer, action-ready member list with role management built into each card.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-600">
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            {members.length} active members
                        </div>
                    </div>

                    <div className="space-y-4">
                        {members.length > 0 ? (
                            members.map((member) => {
                                const canChangeThisMember =
                                    canChangeRoles &&
                                    member.id !== user?.id &&
                                    team.owner_id !== member.id &&
                                    allRoles.length > 0;
                                const isOwner = team.owner_id === member.id;
                                const isCurrentUser = member.id === user?.id;

                                return (
                                    <article
                                        key={member.id}
                                        className="rounded-[28px] border border-black/5 bg-slate-50/50 p-6 transition-all hover:bg-slate-50"
                                    >
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="flex min-w-0 items-start gap-4 lg:items-center">
                                                <Avatar user={member} size="lg" className="shadow-sm" />

                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{member.name}</h3>
                                                        {isOwner && (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-dark px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                                                                <Crown className="h-3 w-3" aria-hidden="true" />
                                                                Owner
                                                            </span>
                                                        )}
                                                        {isCurrentUser && (
                                                            <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 break-words text-[14px] text-slate-500">{member.email}</p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {member.roles && member.roles.length > 0 ? (
                                                            member.roles.map((role) => (
                                                                <span
                                                                    key={role.id}
                                                                    className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 shadow-sm"
                                                                >
                                                                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                                                    {role.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[12px] italic text-slate-400">No roles assigned.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 lg:min-w-[260px] lg:items-end">
                                                <div className="w-full lg:max-w-[240px]">
                                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                        Access Role
                                                    </label>
                                                    {canChangeThisMember ? (
                                                        <div className="relative">
                                                            <select
                                                                aria-label={`Change role for ${member.name}`}
                                                                value={member.roles?.[0]?.id || ""}
                                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                                disabled={roleTargetId === member.id}
                                                                className="w-full appearance-none rounded-full border border-black/5 bg-white px-4 py-2.5 pr-10 text-[14px] font-semibold text-slate-700 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                                                            >
                                                                {allRoles
                                                                    .filter((role) => role.name !== "OWNER")
                                                                    .map((role) => (
                                                                        <option key={role.id} value={role.id}>
                                                                            {role.name}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                                        </div>
                                                    ) : member.roles && member.roles.length > 0 ? (
                                                        <div className="rounded-full border border-black/5 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-500 shadow-sm text-center">
                                                            {member.roles.map((role) => role.name).join(", ")}
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-full border border-dashed border-black/10 bg-transparent px-4 py-2.5 text-[14px] italic text-slate-400 text-center">
                                                            No roles assigned
                                                        </div>
                                                    )}
                                                </div>

                                                {hasAdminPermission && !isOwner && (
                                                    <Menu as="div" className="relative inline-block text-left w-full lg:max-w-[240px]">
                                                        <Menu.Button
                                                            aria-label={`Open actions for ${member.name}`}
                                                            className="inline-flex w-full justify-center items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-[14px] font-semibold text-slate-600 transition-all hover:bg-slate-200"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                                            Actions
                                                        </Menu.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-100"
                                                            enterFrom="transform opacity-0 scale-95"
                                                            enterTo="transform opacity-100 scale-100"
                                                            leave="transition ease-in duration-75"
                                                            leaveFrom="transform opacity-100 scale-100"
                                                            leaveTo="transform opacity-0 scale-95"
                                                        >
                                                            <Menu.Items className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded-[20px] border border-black/5 bg-white/80 backdrop-blur-xl p-1.5 shadow-xl focus:outline-none">
                                                                <Menu.Item>
                                                                    {({ active }) => (
                                                                        <button
                                                                            onClick={() => setMemberToRemove(member)}
                                                                            className={`flex w-full items-center gap-2 rounded-[16px] px-4 py-2.5 text-[14px] font-medium transition-colors ${
                                                                                active
                                                                                    ? "bg-red-50 text-red-600"
                                                                                    : "text-red-500"
                                                                            }`}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                            Remove Member
                                                                        </button>
                                                                    )}
                                                                </Menu.Item>
                                                            </Menu.Items>
                                                        </Transition>
                                                    </Menu>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        ) : (
                            <EmptyState
                                title="No Members Yet"
                                description="Start by inviting teammates so roles, access, and ownership stay visible in one place."
                            />
                        )}
                    </div>
                </section>
            </main>

            {hasAdminPermission && (
                <InviteMemberModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    teamId={team.id}
                    currentCount={usage?.members_count}
                    maxCount={usage?.plan?.max_members}
                />
            )}

            {memberToRemove && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-[1.4rem] border border-border bg-card p-6 shadow-[0_28px_60px_-34px_rgb(var(--shadow-color)/0.45)]">
                        <h3 className="text-lg font-semibold text-foreground">Remove Member?</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Remove <span className="font-medium text-foreground">{memberToRemove.name}</span> from <span className="font-medium text-foreground">{team.name}</span>. They will lose access to team workspaces, projects, and future updates immediately.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                onClick={() => setMemberToRemove(null)}
                                className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoveMember}
                                disabled={removeMemberMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--danger-fg)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {removeMemberMutation.isPending ? "Removing…" : "Remove Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLeaveConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-[1.4rem] border border-border bg-card p-6 shadow-[0_28px_60px_-34px_rgb(var(--shadow-color)/0.45)]">
                        <h3 className="text-lg font-semibold text-foreground">Leave Team?</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Leaving <span className="font-medium text-foreground">{team.name}</span> removes your access to its projects, members, and future activity. A team admin can invite you back later.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                onClick={() => setShowLeaveConfirm(false)}
                                disabled={isLeaving}
                                className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
                            >
                                Stay
                            </button>
                            <button
                                onClick={handleLeaveTeam}
                                disabled={isLeaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--danger-fg)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {isLeaving ? "Leaving…" : "Leave Team"}
                                {!isLeaving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
