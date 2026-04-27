import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function NotificationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
