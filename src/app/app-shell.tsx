import type { ReactNode } from "react";
import QueryProvider from "@/components/providers/query-provider";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { BrowserPushManager } from "@/components/pwa/browser-push-manager";
import { NetworkStatus } from "@/components/pwa/network-status";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ServiceWorkerRegistration />
      <BrowserPushManager />
      <NetworkStatus />
      <ImpersonationBanner />
      <AuthGuard>{children}</AuthGuard>
    </QueryProvider>
  );
}
