"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { Notification } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "@/components/app-link";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadNotifications = async () => {
            setIsLoading(true);
            try {
                const list = await getNotifications();
                setNotifications(list);
            } catch (error) {
                console.error("Failed to load notifications", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNotifications();
    }, []);

    const unreadCount = notifications.filter((notification) => !notification.read_at).length;

    const handleMarkRead = async (id: string) => {
        const previous = notifications;
        // Optimistic: update immediately, roll back if the request fails.
        setNotifications((current) =>
            current.map((notification) =>
                notification.id === id
                    ? { ...notification, read_at: new Date().toISOString() }
                    : notification
            )
        );
        try {
            await markNotificationRead(id);
        } catch (error) {
            console.error("Failed to mark notification read", error);
            setNotifications(previous);
            toast.error("Couldn't mark as read. Please try again.");
        }
    };

    const handleMarkAllRead = async () => {
        const previous = notifications;
        setNotifications((current) =>
            current.map((notification) => ({ ...notification, read_at: new Date().toISOString() }))
        );
        try {
            await markAllNotificationsRead();
        } catch (error) {
            console.error("Failed to mark all notifications read", error);
            setNotifications(previous);
            toast.error("Couldn't mark all as read. Please try again.");
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-2 md:p-3">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/75 bg-white/72 text-primary shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                        <Bell className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Notifications</h1>
                        <p className="text-sm text-muted-foreground">
                            Assignments, mentions, and updates that need your attention.
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex min-h-11 md:min-h-0 items-center justify-center rounded-full border border-white/80 bg-white/78 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-primary-dark hover:text-white"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="rounded-[1.8rem] border border-white/70 bg-white/76 p-8 text-center text-sm text-muted-foreground shadow-[0_22px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    Loading notifications…
                </div>
            ) : notifications.length === 0 ? (
                <div className="rounded-[1.8rem] border border-white/70 bg-white/76 p-8 text-center shadow-[0_22px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <Bell className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                    <h2 className="mb-2 text-xl font-semibold text-foreground">No notifications</h2>
                    <p className="text-muted-foreground">
                        You&apos;re all caught up. Mentions, assignments, and task updates will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        notification.link ? (
                            <Link
                                key={notification.id}
                                href={notification.link}
                                onClick={() => {
                                    if (!notification.read_at) {
                                        void handleMarkRead(notification.id);
                                    }
                                }}
                                className={cn(
                                    "block rounded-[1.4rem] border border-white/70 bg-white/76 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors hover:bg-white",
                                    !notification.read_at && "border-primary/20 bg-[linear-gradient(180deg,rgba(109,93,252,0.08),rgba(255,255,255,0.88))]"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                                                    {notification.type === "mention" && (
                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                            Mention
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">{notification.content}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                Open
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div
                                key={notification.id}
                                className={cn(
                                    "rounded-[1.4rem] border border-white/70 bg-white/76 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors hover:bg-white",
                                    !notification.read_at && "border-primary/20 bg-[linear-gradient(180deg,rgba(109,93,252,0.08),rgba(255,255,255,0.88))]"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                                                    {notification.type === "mention" && (
                                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                            Mention
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">{notification.content}</p>
                                            </div>
                                            {!notification.read_at && (
                                                <button
                                                    type="button"
                                                    className="-my-3.5 inline-flex min-h-11 md:my-0 md:min-h-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                                                    onClick={() => handleMarkRead(notification.id)}
                                                >
                                                    <Check className="h-3 w-3" />
                                                    Mark read
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
