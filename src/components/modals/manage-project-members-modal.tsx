import { useState, useEffect, useCallback, type ReactNode } from "react";
import { inviteProjectMember, getProjectInvites, getTeamBySlug, removeProjectMember } from "@/lib/api";
import { Project, User, ProjectInvite } from "@/lib/types";
import { Search, UserPlus, Trash2 } from "lucide-react";
import { useParams } from "@/lib/navigation";
import { Avatar } from "@/components/ui/avatar";
import { ModalShell } from "@/components/ui/modal-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface ManageProjectMembersModalProps {
    project: Project;
    onUpdate: () => void;
    canManage?: boolean;
    buttonClassName?: string;
    triggerContent?: ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

export function ManageProjectMembersModal({
    project,
    onUpdate,
    canManage = true,
    buttonClassName,
    triggerContent,
    isOpen: controlledIsOpen,
    onOpenChange,
    hideTrigger = false,
}: ManageProjectMembersModalProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [pendingInvites, setPendingInvites] = useState<ProjectInvite[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
    const params = useParams();
    const isOpen = controlledIsOpen ?? internalIsOpen;

    const setIsOpen = (nextOpen: boolean) => {
        onOpenChange?.(nextOpen);
        if (controlledIsOpen === undefined) {
            setInternalIsOpen(nextOpen);
        }
    };

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error && typeof error === "object" && "response" in error) {
            const response = (error as { response?: { data?: { message?: string } } }).response;
            if (response?.data?.message) {
                return response.data.message;
            }
        }

        return fallback;
    };

    const fetchTeamMembers = useCallback(async () => {
        try {
            if (typeof params.teamSlug === "string") {
                const team = await getTeamBySlug(params.teamSlug);
                if (team && team.members) {
                    setTeamMembers(team.members);
                }
            }
        } catch (error) {
            console.error("Failed to fetch team members", error);
        }
    }, [params.teamSlug]);

    const fetchPendingInvites = useCallback(async () => {
        try {
            const invites = await getProjectInvites(project.id);
            setPendingInvites(invites);
        } catch (error) {
            console.error("Failed to fetch pending invites", error);
        }
    }, [project.id]);

    useEffect(() => {
        if (isOpen) {
            if (params.teamSlug) fetchTeamMembers();
            fetchPendingInvites();
        }
    }, [fetchPendingInvites, fetchTeamMembers, isOpen, params.teamSlug]);

    const handleAddMember = async (userId: string) => {
        setIsLoading(true);
        setSuccessMessage("");
        setErrorMessage("");
        try {
            await inviteProjectMember(project.id, { user_id: userId });
            setSuccessMessage("Invitation sent!");
            setSearchQuery("");
            fetchPendingInvites(); // Refresh invites
            // onUpdate(); // Accepted members haven't changed yet
        } catch (error: unknown) {
            console.error("Failed to invite member", error);
            setErrorMessage(getErrorMessage(error, "Failed to invite member"));
        } finally {
            setIsLoading(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;

        setIsLoading(true);
        setSuccessMessage("");
        setErrorMessage("");
        try {
            await removeProjectMember(project.id, memberToRemove.id);
            setSuccessMessage("Member removed!");
            setMemberToRemove(null);
            onUpdate(); // Refresh project data
        } catch (error: unknown) {
            console.error("Failed to remove member", error);
            setErrorMessage(getErrorMessage(error, "Failed to remove member"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteByEmail = async () => {
        if (!inviteEmail) return;
        setIsLoading(true);
        setSuccessMessage("");
        setErrorMessage("");
        try {
            await inviteProjectMember(project.id, { email: inviteEmail });
            setSuccessMessage("Invitation sent to " + inviteEmail);
            setInviteEmail("");
            fetchPendingInvites(); // Refresh invites
        } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, "Failed to invite member"));
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTeamMembers = teamMembers.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Initial filter: Not already a member
    // Also filter out users who already have a PENDING invite
    const availableMembers = filteredTeamMembers.filter(
        tm => !project.members?.some(pm => pm.id === tm.id) &&
            !(pendingInvites || []).some(pi => pi.email === tm.email)
    );

    if (!canManage) {
        return null;
    }

    return (
        <>
            {!hideTrigger ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className={buttonClassName ?? "px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted flex items-center gap-2 transition-colors font-medium text-sm"}
                >
                    {triggerContent ?? (
                        <>
                            <UserPlus className="w-4 h-4" />
                            Members
                        </>
                    )}
                </button>
            ) : null}

            {isOpen && (
                <ModalShell
                    title="Project Members"
                    description="Curate who can see and contribute inside this workspace."
                    onClose={() => setIsOpen(false)}
                    maxWidthClassName="max-w-2xl"
                    contentClassName="max-h-[90vh]"
                    bodyClassName="flex max-h-[90vh] flex-col"
                >
                        <div className="space-y-8 flex-1 overflow-hidden flex flex-col">
                            {/* Current Members */}
                            <div className="space-y-3">
                                <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Current Members</h4>
                                <div className="grid gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {project.members && project.members.length > 0 ? (
                                        project.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between rounded-[1.35rem] border border-black/5 bg-white/78 p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.42)] transition-[border-color,background-color,box-shadow] hover:border-slate-200 hover:bg-white hover:shadow-[0_22px_50px_-34px_rgba(15,23,42,0.5)]">
                                                <div className="flex items-center gap-3">
                                                    <Avatar user={member} size="md" className="h-10 w-10 shadow-sm" />
                                                    <div>
                                                        <p className="text-[14px] font-semibold text-slate-900">{member.name}</p>
                                                        <p className="text-[12px] font-medium text-slate-500">{member.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setMemberToRemove(member)}
                                                    disabled={isLoading}
                                                    aria-label={`Remove ${member.name}`}
                                                    className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                                    title="Remove member"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[13px] font-medium text-slate-500">No specific members assigned.</p>
                                    )}
                                </div>
                            </div>

                            {/* Pending Invites */}
                            {pendingInvites && pendingInvites.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Pending Invitations</h4>
                                    <div className="grid gap-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                        {pendingInvites.map((invite) => (
                                            <div key={invite.id} className="flex items-center justify-between rounded-[1.35rem] border border-amber-200/80 bg-amber-50/75 p-3 shadow-[0_18px_40px_-36px_rgba(217,119,6,0.38)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-[12px] bg-amber-100 flex items-center justify-center text-amber-600 text-[14px] font-bold border border-amber-200">
                                                        ?
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-semibold text-slate-900">{invite.email}</p>
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600/70 mt-0.5">Expires: {new Date(invite.expires_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Member */}
                            <div className="space-y-3 flex-1 flex flex-col min-h-0">
                                <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Add Member from Team</h4>
                                <div className="relative">
                                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                    <label htmlFor={`member-search-${project.id}`} className="sr-only">
                                        Search team members
                                    </label>
                                    <Input
                                        id={`member-search-${project.id}`}
                                        type="text"
                                        aria-label="Search team members"
                                        placeholder="Search team members…"
                                        className="pl-11"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 rounded-[20px] p-1 min-h-[130px] custom-scrollbar">
                                    {availableMembers.length > 0 ? (
                                        availableMembers.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 rounded-[16px] transition-colors border border-transparent hover:border-black/5 hover:bg-slate-50 hover:shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <Avatar user={user} size="sm" tone="tint" />
                                                    <div className="text-[13px]">
                                                        <p className="font-semibold text-slate-900 leading-tight">{user.name}</p>
                                                        <p className="font-medium text-slate-500 mt-0.5">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleAddMember(user.id)}
                                                    disabled={isLoading}
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center h-full">
                                            <p className="text-[14px] font-medium text-slate-500">
                                                {searchQuery ? "No matching members found" : "All team members already added"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-black/5 mt-auto">
                            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-3">Invite by Email</h4>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="colleague@example.com"
                                    className="flex-1"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleInviteByEmail();
                                    }}
                                />
                                <Button
                                    onClick={handleInviteByEmail}
                                    disabled={isLoading || !inviteEmail}
                                    className="whitespace-nowrap"
                                    title="Send Invite"
                                >
                                    Invite
                                </Button>
                            </div>
                            {successMessage ? (
                                <Alert variant="success" className="mt-4">
                                    <AlertDescription>{successMessage}</AlertDescription>
                                </Alert>
                            ) : null}
                            {errorMessage ? (
                                <Alert variant="danger" className="mt-4">
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            ) : null}
                    </div>
                </ModalShell>
            )}

            <ConfirmationDialog
                isOpen={Boolean(memberToRemove)}
                title="Remove Member?"
                description={memberToRemove
                    ? `Are you sure you want to remove ${memberToRemove.name} from this project? They will no longer have access to project tasks and information.`
                    : ""}
                confirmText="Remove Member"
                onConfirm={confirmRemoveMember}
                onCancel={() => setMemberToRemove(null)}
                isLoading={isLoading}
                variant="danger"
            />
        </>
    );
}
