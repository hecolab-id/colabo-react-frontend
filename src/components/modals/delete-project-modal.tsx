"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AlertTriangle } from "lucide-react";
import { Project } from "@/lib/types";

interface DeleteProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (projectId: string) => Promise<void>;
    project: Project;
}

export function DeleteProjectModal({ isOpen, onClose, onConfirm, project }: DeleteProjectModalProps) {
    const [confirmName, setConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setConfirmName("");
            setIsDeleting(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (confirmName !== project.name) return;

        setIsDeleting(true);
        try {
            await onConfirm(project.id);
            onClose();
        } catch (error) {
            console.error("Failed to delete project:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const isMatch = confirmName === project.name;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-foreground flex items-center gap-2 text-red-600"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    Delete Project
                                </Dialog.Title>

                                <div className="mt-4 space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        This action cannot be undone. This will permanently delete the
                                        <span className="font-bold text-foreground"> {project.name} </span>
                                        project, along with all tasks, columns, and settings.
                                    </p>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Please type <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded select-all">{project.name}</span> to confirm.
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmName}
                                            onChange={(e) => setConfirmName(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            placeholder="Type project name here"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        onClick={onClose}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleConfirm}
                                        disabled={!isMatch || isDeleting}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete Project"}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
