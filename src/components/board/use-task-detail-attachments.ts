"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type Dispatch,
    type RefObject,
    type SetStateAction,
} from "react";
import { updateTask, uploadFile } from "@/lib/api";
import type { Task } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { getFileName, isImageFile, type PdfPreview } from "./task-detail-attachments";

interface UseTaskDetailAttachmentsArgs {
    task: Task;
    fileInputRef: RefObject<HTMLInputElement | null>;
    setTaskState: Dispatch<SetStateAction<Task>>;
    onUpdate?: (task: Task) => void;
}

export function useTaskDetailAttachments({
    task,
    fileInputRef,
    setTaskState,
    onUpdate,
}: UseTaskDetailAttachmentsArgs) {
    const [attachments, setAttachments] = useState<string[]>(task.attachments || []);
    const [isUploading, setIsUploading] = useState(false);
    const [showAllAttachments, setShowAllAttachments] = useState(false);
    const [activePdfPreview, setActivePdfPreview] = useState<PdfPreview | null>(null);
    const [imagePreviewIndex, setImagePreviewIndex] = useState<number | null>(null);
    const [pendingReplace, setPendingReplace] = useState<{ files: File[]; collisions: string[] } | null>(null);
    const [recentlyReplaced, setRecentlyReplaced] = useState<string[]>([]);
    const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);
    const [attachmentAnnouncement, setAttachmentAnnouncement] = useState("");
    const [removingAttachmentUrl, setRemovingAttachmentUrl] = useState<string | null>(null);

    const attachmentsRef = useRef(attachments);
    const taskIdRef = useRef(task.id);
    const attachmentsTouchedRef = useRef(false);
    const attachmentsPersistQueueRef = useRef<Promise<unknown>>(Promise.resolve());

    useEffect(() => {
        attachmentsRef.current = attachments;
    }, [attachments]);

    useEffect(() => {
        taskIdRef.current = task.id;
        attachmentsTouchedRef.current = false;
        attachmentsPersistQueueRef.current = Promise.resolve();
    }, [task.id]);

    useEffect(() => {
        if (recentlyReplaced.length === 0) return;
        const timeout = setTimeout(() => setRecentlyReplaced([]), 1600);
        return () => clearTimeout(timeout);
    }, [recentlyReplaced]);

    useEffect(() => {
        if (recentlyAdded.length === 0) return;
        const timeout = setTimeout(() => setRecentlyAdded([]), 1600);
        return () => clearTimeout(timeout);
    }, [recentlyAdded]);

    const imageAttachments = useMemo(
        () => attachments.filter((item) => isImageFile(item)),
        [attachments],
    );

    const resetAttachments = useCallback((nextTask: Task) => {
        const nextAttachments = nextTask.attachments || [];
        attachmentsRef.current = nextAttachments;
        setAttachments(nextAttachments);
        setActivePdfPreview(null);
        setImagePreviewIndex(null);
        setPendingReplace(null);
        setRecentlyReplaced([]);
        setRecentlyAdded([]);
        setAttachmentAnnouncement("");
        setRemovingAttachmentUrl(null);
        setShowAllAttachments(false);
        setIsUploading(false);
    }, []);

    const applyFetchedTaskAttachments = useCallback((fetchedTask: Task) => {
        if (attachmentsTouchedRef.current) return;

        const nextAttachments = fetchedTask.attachments || [];
        attachmentsRef.current = nextAttachments;
        setAttachments(nextAttachments);
    }, []);

    const syncAttachmentsFromTask = useCallback((nextTask: Task) => {
        const nextAttachments = nextTask.attachments || [];
        attachmentsRef.current = nextAttachments;
        setAttachments(nextAttachments);
    }, []);

    const commitAttachments = useCallback(
        (mutate: (current: string[]) => string[]): Promise<string[]> => {
            const ownerTaskId = task.id;
            const op = attachmentsPersistQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    if (taskIdRef.current !== ownerTaskId) return attachmentsRef.current;

                    const before = attachmentsRef.current;
                    const next = mutate(before);
                    attachmentsRef.current = next;
                    setAttachments(next);
                    try {
                        const updated = await updateTask(ownerTaskId, { attachments: next });
                        if (taskIdRef.current !== ownerTaskId) return next;
                        setTaskState((prev) => ({ ...prev, ...updated, attachments: next }));
                        onUpdate?.({ ...updated, attachments: next });
                        return next;
                    } catch (error) {
                        if (taskIdRef.current === ownerTaskId) {
                            attachmentsRef.current = before;
                            setAttachments(before);
                        }
                        throw error;
                    }
                });
            attachmentsPersistQueueRef.current = op.catch(() => undefined);
            return op;
        },
        [task.id, onUpdate, setTaskState],
    );

    const handleDescriptionImageUpload = useCallback(
        async (file: File): Promise<string> => {
            const ownerTaskId = task.id;
            attachmentsTouchedRef.current = true;
            const { url } = await uploadFile(file);
            if (taskIdRef.current !== ownerTaskId) return url;

            attachmentsPersistQueueRef.current = attachmentsPersistQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    if (taskIdRef.current !== ownerTaskId || attachmentsRef.current.includes(url)) return;
                    const next = [...attachmentsRef.current, url];
                    attachmentsRef.current = next;
                    setAttachments(next);
                    setRecentlyAdded((prev) => (prev.includes(url) ? prev : [...prev, url]));
                    try {
                        const updated = await updateTask(ownerTaskId, { attachments: next });
                        if (taskIdRef.current !== ownerTaskId) return;
                        setTaskState((prev) => ({ ...prev, ...updated, attachments: next }));
                        if (next.length > 3) setShowAllAttachments(true);
                        setAttachmentAnnouncement(`Image added to attachments (${next.length}).`);
                    } catch (error) {
                        console.error("Failed to add description image to attachments:", error);
                        toast.error("Couldn't add the image to attachments.");
                        if (taskIdRef.current !== ownerTaskId) return;
                        const reverted = attachmentsRef.current.filter((item) => item !== url);
                        attachmentsRef.current = reverted;
                        setAttachments(reverted);
                        setRecentlyAdded((prev) => prev.filter((item) => item !== url));
                    }
                });

            return url;
        },
        [task.id, setTaskState],
    );

    const performUpload = async (files: File[]) => {
        attachmentsTouchedRef.current = true;
        setIsUploading(true);

        try {
            const uploadedFiles = await Promise.all(files.map((file) => uploadFile(file)));
            const replacedNames: string[] = [];

            await commitAttachments((current) => {
                const nextAttachments = [...current];
                const usedIndexes = new Set<number>();
                const appended: string[] = [];

                files.forEach((file, fileIndex) => {
                    const url = uploadedFiles[fileIndex].url;
                    const targetName = file.name.toLowerCase();
                    const existingIndex = nextAttachments.findIndex(
                        (item, itemIndex) =>
                            !usedIndexes.has(itemIndex) && getFileName(item).toLowerCase() === targetName,
                    );

                    if (existingIndex !== -1) {
                        nextAttachments[existingIndex] = url;
                        usedIndexes.add(existingIndex);
                        replacedNames.push(targetName);
                    } else {
                        appended.push(url);
                    }
                });

                return [...nextAttachments, ...appended];
            });

            if (replacedNames.length > 0) {
                setRecentlyReplaced(replacedNames);
            }
        } catch (error) {
            console.error("Failed to upload file:", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const maxFileSize = 5 * 1024 * 1024;
        const oversizedFiles = files.filter((file) => file.size > maxFileSize);

        if (fileInputRef.current) fileInputRef.current.value = "";

        if (oversizedFiles.length > 0) {
            alert(`The following files exceed the 5 MB limit:\n${oversizedFiles.map((file) => file.name).join("\n")}`);
            return;
        }

        const existingNames = new Set(attachments.map((item) => getFileName(item).toLowerCase()));
        const collisions = files
            .filter((file) => existingNames.has(file.name.toLowerCase()))
            .map((file) => file.name);

        if (collisions.length > 0) {
            setPendingReplace({ files, collisions });
            return;
        }

        void performUpload(files);
    };

    const confirmReplace = async () => {
        if (!pendingReplace) return;
        await performUpload(pendingReplace.files);
        setPendingReplace(null);
    };

    const cancelReplace = () => {
        setPendingReplace(null);
    };

    const handleRemoveAttachment = async (url: string) => {
        if (removingAttachmentUrl) return;

        attachmentsTouchedRef.current = true;
        setRemovingAttachmentUrl(url);
        try {
            await commitAttachments((current) => current.filter((item) => item !== url));
        } catch (error) {
            console.error("Failed to remove attachment:", error);
            toast.error("Couldn't remove the attachment. Please try again.");
        } finally {
            setRemovingAttachmentUrl(null);
        }
    };

    const openImagePreview = (url: string) => {
        const index = imageAttachments.indexOf(url);
        if (index !== -1) setImagePreviewIndex(index);
    };

    return {
        activePdfPreview,
        applyFetchedTaskAttachments,
        attachmentAnnouncement,
        attachments,
        attachmentsRef,
        cancelReplace,
        confirmReplace,
        handleDescriptionImageUpload,
        handleFileUpload,
        handleRemoveAttachment,
        imageAttachments,
        imagePreviewIndex,
        isUploading,
        openImagePreview,
        pendingReplace,
        recentlyAdded,
        recentlyReplaced,
        removingAttachmentUrl,
        resetAttachments,
        setActivePdfPreview,
        setImagePreviewIndex,
        setShowAllAttachments,
        showAllAttachments,
        syncAttachmentsFromTask,
    };
}
