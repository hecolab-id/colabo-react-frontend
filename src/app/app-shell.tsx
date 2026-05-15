import type { ReactNode } from "react";
import QueryProvider from "@/components/providers/query-provider";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { BrowserPushManager } from "@/components/pwa/browser-push-manager";
import { NotificationSoftPrompt } from "@/components/pwa/notification-soft-prompt";
import { NetworkStatus } from "@/components/pwa/network-status";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ServiceWorkerRegistration />
      <BrowserPushManager />
      <NotificationSoftPrompt />
      <NetworkStatus />
      <ImpersonationBanner />
      <AuthGuard>{children}</AuthGuard>
    </QueryProvider>
  );
}
