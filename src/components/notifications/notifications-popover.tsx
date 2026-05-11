"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "@/components/app-link";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPopover() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const list = await getNotifications();
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.read_at).length);
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        } else {
            // Initial load for badge count
            loadNotifications();
        }
    }, [isOpen]);

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative h-9 w-9 flex items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-50 hover:text-primary hover:scale-105 active:scale-95 hover:cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                <Bell className="w-[20px] h-[20px]" />
                {unreadCount > 0 && (
                    <span className="absolute top-[6px] right-[8px] w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full z-[60] mt-3 w-80 overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-200 sm:w-96">
                        <div className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-4">
                            <h3 className="text-[15px] font-semibold text-slate-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[13px] font-medium text-slate-500 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md px-2 py-0.5"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No notifications yet
                                </div>
                            ) : (
                                <div className="divide-y divide-black/5">
                                    {notifications.map((notification) => (
                                        notification.link ? (
                                            <Link
                                                key={notification.id}
                                                href={notification.link}
                                                onClick={() => {
                                                    if (!notification.read_at) {
                                                        void handleMarkRead(notification.id);
                                                    }
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    "relative flex gap-4 bg-white px-5 py-4 transition-colors hover:bg-slate-50",
                                                    !notification.read_at && "bg-slate-50"
                                                )}
                                            >
                                                {!notification.read_at && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary-dark rounded-r-full" />
                                                )}
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        {notification.type === "mention" && (
                                                            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                                                                Mention
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[14px] leading-snug text-slate-600">
                                                        <span className="font-semibold text-slate-900">{notification.title}</span>{" "}
                                                        {notification.content}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-[12px] text-slate-400 font-medium">
                                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                        </span>
                                                        {!notification.read_at && (
                                                            <span className="text-[12px] font-semibold text-slate-900">Open</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div
                                                key={notification.id}
                                                className={cn(
                                                    "relative flex gap-4 bg-white px-5 py-4 transition-colors hover:bg-slate-50",
                                                    !notification.read_at && "bg-slate-50"
                                                )}
                                            >
                                                {!notification.read_at && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary-dark rounded-r-full" />
                                                )}
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        {notification.type === "mention" && (
                                                            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                                                                Mention
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[14px] leading-snug text-slate-600">
                                                        <span className="font-semibold text-slate-900">{notification.title}</span>{" "}
                                                        {notification.content}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-[12px] text-slate-400 font-medium">
                                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                        </span>
                                                        {!notification.read_at && (
                                                            <button
                                                                onClick={() => handleMarkRead(notification.id)}
                                                                className="text-[12px] font-semibold text-slate-900 hover:text-slate-600 focus:outline-none transition-colors"
                                                            >
                                                                Mark read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
