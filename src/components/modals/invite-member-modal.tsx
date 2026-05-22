"use client";

import { Fragment, useState } from "react";
import axios from "axios";
import { Dialog, Transition } from "@headlessui/react";
import { X, Check, AlertCircle } from "lucide-react";
import { useCreateInvite } from "@/lib/hooks/use-team";

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    // Limits
    currentCount?: number;
    maxCount?: number;
}

export function InviteMemberModal({ isOpen, onClose, teamId, currentCount, maxCount }: InviteMemberModalProps) {
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");
    const [inviteError, setInviteError] = useState("");

    const createInviteMutation = useCreateInvite(teamId);

    // Check limit
    const isLimitReached = maxCount !== undefined && currentCount !== undefined && currentCount >= maxCount;

    const handleClose = () => {
        setInviteEmail("");
        setInviteSuccess("");
        setInviteError("");
        onClose();
    };

    const handleGenerate = async () => {
        if (!inviteEmail.trim() || isLimitReached) return;
        setInviteError("");
        setInviteSuccess("");
        try {
            const result = await createInviteMutation.mutateAsync(inviteEmail.trim());
            setInviteSuccess(`Invitation sent to ${result.email}.`);
            setInviteEmail("");
        } catch (error) {
            console.error("Failed to generate invite", error);

            if (axios.isAxiosError(error)) {
                const responseMessage = error.response?.data?.message;
                const errorCode = error.response?.data?.errors?.code;
                const errorLimit = error.response?.data?.errors?.limit;

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
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                {/* ... existing styles ... */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[32px] bg-white p-8 text-left align-middle shadow-2xl transition-all border border-black/5">
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className=" text-[24px] font-semibold tracking-tight text-slate-900">
                                        Invite Member
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {(isLimitReached || inviteError) && (
                                    <div
                                        aria-live="polite"
                                        className="mb-6 rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-700"
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                                            <div>
                                                <p className="text-[14px] font-semibold text-red-900">
                                                    {isLimitReached ? "Member Limit Reached" : "Invite Unavailable"}
                                                </p>
                                                <p className="mt-1.5 text-[13px] leading-relaxed text-red-700">
                                                    {inviteError || `You have reached the limit of ${maxCount} members on your current plan. Please upgrade to Pro for unlimited members.`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-2 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Member Email</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => {
                                                setInviteEmail(e.target.value);
                                                setInviteError("");
                                                setInviteSuccess("");
                                            }}
                                            placeholder="member@example.com"
                                            className="w-full rounded-2xl border-2 border-transparent bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-900 transition-all placeholder:font-normal placeholder:text-slate-400 hover:bg-slate-100 focus:border-slate-200 focus:bg-white focus:outline-none disabled:opacity-50"
                                            disabled={isLimitReached}
                                        />
                                        <p className="text-[13px] text-slate-500">New team invitations are sent as the `MEMBER` role.</p>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={createInviteMutation.isPending || isLimitReached || !inviteEmail.trim()}
                                        className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark px-6 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-primary-dark-hover hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isLimitReached ? "Limit Reached" : (createInviteMutation.isPending ? "Sending…" : "Send Invitation")}
                                    </button>

                                    {inviteSuccess && (
                                        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                                            <div className="flex items-start gap-3">
                                                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                                <p className="text-[13px] font-medium leading-relaxed">{inviteSuccess}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
