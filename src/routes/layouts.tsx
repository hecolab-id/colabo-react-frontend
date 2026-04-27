import { Outlet } from "react-router-dom";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminShell } from "@/components/admin/admin-shell";

export function DashboardLayoutRoute() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}

export function AdminLayoutRoute() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
