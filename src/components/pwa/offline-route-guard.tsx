"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/lib/navigation";

const OFFLINE_SUPPORTED_PATHS = new Set([
    "/dashboard",
    "/my-tasks",
    "/offline",
]);

export function OfflineRouteGuard() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const redirectIfUnsupported = () => {
            if (navigator.onLine || OFFLINE_SUPPORTED_PATHS.has(pathname)) {
                return;
            }

            router.replace("/offline");
        };

        redirectIfUnsupported();
        window.addEventListener("offline", redirectIfUnsupported);

        return () => {
            window.removeEventListener("offline", redirectIfUnsupported);
        };
    }, [pathname, router]);

    return null;
}
