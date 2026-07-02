"use client";

import Image from "@/components/app-image";
import { LogOut, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRouter } from "@/lib/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuHeader,
    DropdownMenuItem,
    DropdownMenuLink,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu className="relative ml-2 py-4">
            <DropdownMenuTrigger className="relative flex rounded-full bg-transparent p-0 hover:cursor-pointer hover:bg-transparent">
                <span className="sr-only">Open user menu</span>
                <div className="h-9 w-9 overflow-hidden rounded-full border border-[var(--surface-card-border)] shadow-sm ring-2 ring-transparent transition-all focus-visible:ring-primary/30">
                    <Image
                        src={user.avatar_url || "https://ui-avatars.com/api/?background=f8fafc&color=0f172a&name=" + encodeURIComponent(user.name || "U")}
                        alt={user.name || "User"}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                    />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent widthClassName="w-64">
                <DropdownMenuHeader>
                    <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{user.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
                </DropdownMenuHeader>

                <div className="p-1">
                    <DropdownMenuLink href="/dashboard/settings" icon={<Settings className="h-4 w-4" aria-hidden="true" />}>
                        Settings
                    </DropdownMenuLink>
                    <DropdownMenuItem
                        danger
                        icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                        onClick={handleLogout}
                    >
                        Sign out
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
