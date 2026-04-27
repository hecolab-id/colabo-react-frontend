"use client";

import Image from "@/components/app-image";
import Link from "@/components/app-link";
import { usePathname, useRouter } from "@/lib/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
    Building2,
    CreditCard,
    LayoutDashboard,
    Menu,
    LogOut,
    PanelsTopLeft,
    Settings,
    UserCog,
    WalletCards,
    X,
} from "lucide-react";
import { useStore } from "@/lib/store";

const navItems = [
    { href: "/admin", label: "Overview", description: "Business pulse", icon: LayoutDashboard },
    { href: "/admin/teams", label: "Teams", description: "Tenant health", icon: Building2 },
    { href: "/admin/revenue", label: "Revenue", description: "MRR and growth", icon: WalletCards },
    { href: "/admin/payments", label: "Payments", description: "Transactions", icon: CreditCard },
    { href: "/admin/users", label: "Users", description: "Accounts and support", icon: UserCog },
    { href: "/admin/plans", label: "Plans", description: "Pricing tiers", icon: PanelsTopLeft },
];

export function AdminShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() => {
        document.documentElement.classList.add("admin-dark");
        return () => {
            document.documentElement.classList.remove("admin-dark");
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem("admin-nav-collapsed");
        setIsCollapsed(saved === "true");
    }, []);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        if (!user.is_super_admin) {
            router.push("/dashboard");
        }
    }, [router, user]);

    useEffect(() => {
        setProfileOpen(false);
        setMobileNavOpen(false);
    }, [pathname]);

    const toggleCollapsed = () => {
        setIsCollapsed((current) => {
            const next = !current;
            if (typeof window !== "undefined") {
                window.localStorage.setItem("admin-nav-collapsed", String(next));
            }
            return next;
        });
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_18%),radial-gradient(circle_at_top_right,rgba(211,165,116,0.16),transparent_26%),linear-gradient(180deg,#fdfefe_0%,#eef4fb_100%)] text-slate-950">
            <aside
                className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/75 bg-white/72 shadow-[20px_0_60px_rgba(15,23,42,0.06)] backdrop-blur-2xl lg:block ${
                    isCollapsed ? "w-[92px]" : "w-[284px]"
                }`}
            >
                <div className="flex h-full flex-col px-3 py-4">
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-3 px-2 pb-5`}>
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#141924] shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
                                <Image src="/logo.webp" alt="Colabo Logo" width={44} height={44} className="h-11 w-11 object-cover" />
                            </div>
                            {!isCollapsed && (
                                <div>
                                    <p className="font-space-grotesk text-lg font-semibold text-slate-950">Colabo Admin</p>
                                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner Console</p>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <button
                                type="button"
                                onClick={toggleCollapsed}
                                aria-label="Collapse admin navigation"
                                className="rounded-full border border-black/5 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                        )}
                        {isCollapsed && (
                            <button
                                type="button"
                                onClick={toggleCollapsed}
                                aria-label="Expand admin navigation"
                                className="mt-3 rounded-full border border-black/5 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                            >
                                <PanelsTopLeft className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const active = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`group flex items-center gap-3 rounded-[20px] px-4 py-3 transition ${
                                        isCollapsed ? "justify-center px-0" : ""
                                    } ${
                                        active
                                            ? "bg-slate-950 text-white shadow-[0_14px_36px_rgba(15,23,42,0.18)]"
                                            : "text-slate-600 hover:bg-white hover:text-slate-950"
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-950"}`} />
                                    {!isCollapsed && (
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold">{item.label}</div>
                                            <div className={`mt-1 truncate text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{item.description}</div>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)}>
                    <div
                        className="h-full w-[82vw] max-w-[320px] border-r border-white/70 bg-white/88 p-4 shadow-[20px_0_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="font-space-grotesk text-lg font-semibold text-slate-950">Colabo Admin</p>
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Owner Console</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Close admin navigation"
                                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-300"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const active = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileNavOpen(false)}
                                        className={`flex items-center gap-3 rounded-[18px] px-4 py-3 ${
                                            active ? "bg-slate-950 text-white" : "border border-white/80 bg-white text-slate-700"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <div>
                                            <div className="text-sm font-semibold">{item.label}</div>
                                            <div className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{item.description}</div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            <div className={`min-h-screen transition-all duration-300 ${isCollapsed ? "lg:pl-[116px]" : "lg:pl-[308px]"}`}>
                <div className="px-3 py-3 sm:px-5 sm:py-5 lg:px-8">
                    <div className="rounded-[28px] border border-white/75 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                        <div className="flex items-center gap-3 border-b border-white/75 px-4 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(true)}
                                aria-label="Open admin navigation"
                                className="rounded-full border border-black/5 bg-white p-2 text-slate-500 lg:hidden"
                            >
                                <Menu className="h-4 w-4" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Admin Workspace</p>
                                <h1 className="truncate font-space-grotesk text-xl font-semibold text-slate-950 sm:text-2xl">
                                    Welcome back, {user?.name?.split(" ")[0] || "Owner"}
                                </h1>
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen((current) => !current)}
                                    aria-label="Open profile menu"
                                    className="flex items-center gap-3 rounded-full border border-white/80 bg-white/78 px-2 py-2 text-left shadow-sm"
                                >
                                    <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(180deg,#f0b181,#d88245)] text-sm font-semibold text-[#111827]">
                                        {(user?.name || "A").slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="hidden pr-2 sm:block">
                                        <p className="text-sm font-medium text-slate-950">{user?.name || "Owner"}</p>
                                        <p className="text-xs text-slate-500">{user?.email || "admin@colabo"}</p>
                                    </div>
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-56 rounded-[20px] border border-white/80 bg-white/88 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
                                        <Link
                                            href="/dashboard/settings"
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Settings
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-sm text-rose-600 transition hover:bg-slate-50"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 p-4 sm:p-6 lg:p-7">{children}</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
