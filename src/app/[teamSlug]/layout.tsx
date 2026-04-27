import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function TeamLayout({
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
