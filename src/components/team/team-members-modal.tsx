"use client";

import axios from "axios";
import { Team, User, TeamInvite } from "@/lib/types";
import { X, UserPlus, Trash2, Shield, Check, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createInvite, removeMember, getTeamInvites } from "@/lib/api";
import { useEscapeKey } from "@/lib/hooks/use-escape-key";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";

interface TeamMembersModalProps {
    team: Team;
    currentUser: User;
    onClose: () => void;
    onUpdate: () => void;
}

export function TeamMembersModal({ team, currentUser, onClose, onUpdate }: TeamMembersModalProps) {
    const [inviteEmail, setInviteEmail] = useState("");
    const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
    const [isInviting, setIsInviting] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");
    const safePendingInvites = Array.isArray(pendingInvites) ? pendingInvites : [];
    useEscapeKey(mounted, onClose);

    useEffect(() => {
        setMounted(true);
        getTeamInvites(team.id).then(setPendingInvites).catch(console.error);

        // Trigger generic update to refresh team data (fetch members)
        onUpdate();

        return () => setMounted(false);
    }, [onUpdate, team.id]);

    const members = team.members || [];
    // Calculate role based on team.owner_id
    const isOwner = team.owner_id === currentUser.id;

    const handleInviteMember = async () => {
        if (!inviteEmail.trim()) return;
        setIsInviting(true);
        setInviteError("");
        setInviteSuccess("");
        try {
            const invite = await createInvite(team.id, inviteEmail.trim());
            setInviteSuccess(`Invitation sent to ${invite.email}.`);
            setInviteEmail("");
            setPendingInvites(await getTeamInvites(team.id));
        } catch (e) {
            console.error(e);

            if (axios.isAxiosError(e)) {
                const responseMessage = e.response?.data?.message;
                const errorCode = e.response?.data?.errors?.code;
                const errorLimit = e.response?.data?.errors?.limit;

                if (errorCode === "PAYWALL_REQUIRED") {
                    setInviteError(
                        responseMessage ||
                        (typeof errorLimit === "number"
                            ? `You have reached the ${errorLimit} member limit on your current plan. Upgrade to Pro for unlimited members.`
                            : "You have reached the maximum number of members for your plan. Upgrade to Pro for unlimited members.")
                    );
                    return;
                }

                if (responseMessage) {
                    setInviteError(responseMessage);
                    return;
                }
            }

            setInviteError("Failed to send invitation email. Please try again.");
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        setRemovingId(userId);
        try {
            await removeMember(team.id, userId);
            onUpdate(); // Reload team data
        } catch (e) {
            console.error(e);
            toast.error("Couldn't remove the member. Please try again.");
        } finally {
            setRemovingId(null);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-white border border-black/5 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-black/5">
                    <h2 className=" text-[24px] font-semibold tracking-tight text-slate-900">Team Members</h2>
                    <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Invite Section */}
                    <div className="bg-slate-50/50 p-6 rounded-[28px] border border-black/5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-2">
                                <UserPlus className="h-3.5 w-3.5" /> Invite New Members
                            </h3>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Role: MEMBER</span>
                        </div>
                        <p className="text-[13px] text-slate-500 mb-5">
                            Send an email invitation to join <strong>{team.name}</strong>.
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => {
                                    setInviteEmail(e.target.value);
                                    setInviteError("");
                                    setInviteSuccess("");
                                }}
                                placeholder="member@example.com"
                                className="flex-1 rounded-2xl border-2 border-transparent bg-slate-50 px-4 py-3 text-[14px] font-medium text-slate-900 transition-all placeholder:font-normal placeholder:text-slate-400 hover:bg-slate-100 focus:border-slate-200 focus:bg-white focus:outline-none"
                            />
                            <button
                                onClick={handleInviteMember}
                                disabled={isInviting || !inviteEmail.trim()}
                                className="inline-flex h-12 items-center justify-center rounded-full bg-primary-dark px-6 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary-dark-hover hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isInviting ? "Sending..." : "Invite"}
                            </button>
                        </div>

                        {inviteError && (
                            <div
                                aria-live="polite"
                                className="mb-4 rounded-[20px] border border-red-200 bg-red-50 p-4 text-red-700"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                                    <div>
                                        <p className="text-[14px] font-bold text-red-900 leading-tight">Invite Unavailable</p>
                                        <p className="mt-1.5 text-[13px] leading-relaxed">{inviteError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {inviteSuccess && (
                            <div className="mb-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                                <div className="flex items-start gap-3">
                                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <p className="text-[13px] font-medium leading-relaxed">{inviteSuccess}</p>
                                </div>
                            </div>
                        )}

                        {safePendingInvites.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Pending Invitations</p>
                                <div className="space-y-2">
                                    {safePendingInvites.map((invite) => (
                                        <div key={invite.id} className="rounded-[20px] border border-amber-100 bg-amber-50/50 px-4 py-3 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-[14px] font-semibold text-slate-900">{invite.email}</p>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600/70 mt-0.5">
                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    <div>
                        <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-4">
                            Members ({members.length})
                        </h3>
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 rounded-[24px] border border-black/5 bg-slate-50 shadow-sm transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <Avatar user={member} size="md" className="h-12 w-12 shadow-lg shadow-slate-900/10" />
                                        <div>
                                            <p className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                                                {member.name}
                                                {member.id === team.owner_id && (
                                                    <Shield className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                )}
                                            </p>
                                            <p className="text-[13px] font-medium text-slate-500 line-clamp-1">{member.email}</p>
                                        </div>
                                    </div>

                                    {isOwner && member.id !== currentUser.id && (
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            disabled={removingId === member.id}
                                            className="rounded-full p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                                            title="Remove member"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
