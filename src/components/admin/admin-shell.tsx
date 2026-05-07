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
    Sparkles,
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
    { href: "/admin/ai-usage", label: "AI Usage", description: "Tokens by team & feature", icon: Sparkles },
];

export function AdminShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

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
        <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_18%),radial-gradient(circle_at_top_right,rgba(184,173,255,0.14),transparent_26%),linear-gradient(180deg,#fdfefe_0%,#eef4fb_100%)] text-foreground">
            <aside
                className={`fixed inset-y-0 left-0 z-40 hidden border-r border-black/5 bg-white lg:block ${
                    isCollapsed ? "w-[92px]" : "w-[284px]"
                }`}
            >
                <div className="flex h-full flex-col px-3 py-4">
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-3 px-2 pb-5`}>
                        <div className="flex items-center gap-3">
                            <Image
                                src="/logo.webp"
                                alt="Colabo Logo"
                                width={40}
                                height={40}
                                className="h-10 w-10 shrink-0 object-contain"
                            />
                            {!isCollapsed && (
                                <div>
                                    <p className="font-space-grotesk text-lg font-semibold text-foreground">Colabo Admin</p>
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Ops Console</p>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <button
                                type="button"
                                onClick={toggleCollapsed}
                                aria-label="Collapse admin navigation"
                                className="rounded-full border border-black/5 bg-white p-2 text-muted-foreground transition hover:bg-muted"
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                        )}
                        {isCollapsed && (
                            <button
                                type="button"
                                onClick={toggleCollapsed}
                                aria-label="Expand admin navigation"
                                className="mt-3 rounded-full border border-black/5 bg-white p-2 text-muted-foreground transition hover:bg-muted"
                            >
                                <PanelsTopLeft className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const active = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`group flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition ${
                                        isCollapsed ? "justify-center px-0" : ""
                                    } ${
                                        active
                                            ? "bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgba(109,93,252,0.55)]"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                                    {!isCollapsed && (
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold">{item.label}</div>
                                            <div className={`mt-0.5 truncate text-[11px] ${active ? "text-white/75" : "text-muted-foreground"}`}>{item.description}</div>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-md lg:hidden" onClick={() => setMobileNavOpen(false)}>
                    <div
                        className="h-full w-[82vw] max-w-[320px] border-r border-black/5 bg-white p-4 shadow-glass"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="font-space-grotesk text-lg font-semibold text-foreground">Colabo Admin</p>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Ops Console</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Close admin navigation"
                                className="rounded-full border border-black/5 bg-white p-2 text-muted-foreground transition hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const active = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileNavOpen(false)}
                                        className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${
                                            active
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <div>
                                            <div className="text-sm font-semibold">{item.label}</div>
                                            <div className={`mt-0.5 text-[11px] ${active ? "text-white/75" : "text-muted-foreground"}`}>{item.description}</div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            <div className={`min-h-screen transition-all duration-300 ${isCollapsed ? "lg:pl-[92px]" : "lg:pl-[284px]"}`}>
                <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Open admin navigation"
                        className="rounded-full border border-black/5 bg-white p-2 text-muted-foreground lg:hidden"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Admin Workspace</p>
                        <h1 className="truncate font-space-grotesk text-xl font-semibold text-foreground sm:text-2xl">
                            Welcome back, {user?.name?.split(" ")[0] || "Owner"}
                        </h1>
                    </div>

                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setProfileOpen((current) => !current)}
                            aria-label="Open profile menu"
                            className="flex items-center gap-3 rounded-full border border-black/5 bg-white px-2 py-1.5 text-left transition hover:bg-muted"
                        >
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-primary">
                                {(user?.name || "A").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="hidden pr-2 sm:block">
                                <p className="text-sm font-medium text-foreground">{user?.name || "Owner"}</p>
                                <p className="text-[11px] text-muted-foreground">{user?.email || "admin@colabo"}</p>
                            </div>
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-[14px] border border-black/5 bg-white p-1.5 shadow-glass">
                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[var(--danger-fg)] transition hover:bg-muted"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
            </div>
        </main>
    );
}
