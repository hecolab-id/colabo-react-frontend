"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import Image from "@/components/app-image";
import Link from "@/components/app-link";
import { LogOut, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function UserMenu() {
    const user = useStore((state) => state.user);
    const logout = useStore((state) => state.logout);
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/login"); // or wherever the login page is
    };

    if (!user) return null;

    return (
        <Menu as="div" className="relative ml-2 py-4">
            <Menu.Button className="relative hover:cursor-pointer flex items-center justify-center rounded-full bg-white focus:outline-none transition-transform hover:scale-105 active:scale-95">
                <span className="sr-only">Open user menu</span>
                <div className="h-9 w-9 rounded-full overflow-hidden border border-black/5 shadow-sm ring-2 ring-transparent transition-all focus-visible:ring-primary/30">
                    <Image
                        src={user.avatar_url || "https://ui-avatars.com/api/?background=f8fafc&color=0f172a&name=" + encodeURIComponent(user.name || "U")}
                        alt={user.name || "User"}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                    />
                </div>
            </Menu.Button>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-[24px] bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 focus:outline-none overflow-hidden">
                    <div className="px-5 py-4 border-b border-black/5 bg-slate-50/50">
                        <p className="text-[15px] font-semibold text-slate-900 truncate tracking-tight">{user.name}</p>
                        <p className="text-[13px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="p-2 space-y-0.5">
                        <Menu.Item>
                            {({ active }) => (
                                <Link
                                    href="/dashboard/settings"
                                    className={cn(
                                        active ? "bg-slate-50 text-slate-900" : "text-slate-600",
                                        "group flex w-full items-center rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors"
                                    )}
                                >
                                    <Settings className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                    Settings
                                </Link>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={handleLogout}
                                    className={cn(
                                        active ? "bg-rose-50 text-rose-600" : "text-slate-600",
                                        "group flex w-full items-center rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors"
                                    )}
                                >
                                    <LogOut className="mr-3 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                    Sign out
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
