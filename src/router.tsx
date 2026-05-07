import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { AdminLayoutRoute, DashboardLayoutRoute } from "@/routes/layouts";
import { GoogleAuthPage } from "@/routes/google-auth-page";
import DashboardPage from "@/app/dashboard/page";
import MyTasksPage from "@/app/my-tasks/page";
import OfflinePage from "@/app/offline/page";

const SettingsPage = lazy(() => import("@/app/dashboard/settings/page"));
const CreateTeamPage = lazy(() => import("@/app/dashboard/teams/create/page"));
const ProjectDetailPage = lazy(() => import("@/app/dashboard/projects/[id]/page"));
const LoginPage = lazy(() => import("@/app/login/page"));
const RegisterPage = lazy(() => import("@/app/register/page"));
const ForgotPasswordPage = lazy(() => import("@/app/forgot-password/page"));
const ResetPasswordPage = lazy(() => import("@/app/reset-password/page"));
const VerifyEmailPage = lazy(() => import("@/app/verify-email/page"));
const VerifyRequestPage = lazy(() => import("@/app/verify-request/page"));
const NotificationsPage = lazy(() => import("@/app/notifications/page"));
const OnboardingPage = lazy(() => import("@/app/onboarding/page"));
const AuthCallbackPage = lazy(() => import("@/app/auth/callback/page"));
const InvitePage = lazy(() => import("@/app/invite/[code]/page"));
const TeamInvitePage = lazy(() => import("@/app/invites/team/[token]/page"));
const ProjectInviteTokenPage = lazy(() => import("@/app/invites/project/[token]/page"));
const ProjectInvitePage = lazy(() => import("@/app/project-invite/page"));
const TeamDashboardPage = lazy(() => import("@/app/[teamSlug]/page"));
const TeamActivityPage = lazy(() => import("@/app/[teamSlug]/activity/page"));
const TeamMembersPage = lazy(() => import("@/app/[teamSlug]/members/page"));
const TeamSettingsPage = lazy(() => import("@/app/[teamSlug]/settings/page"));
const TeamProjectPage = lazy(() => import("@/app/[teamSlug]/[projectSlug]/page"));
const TeamProjectSettingsPage = lazy(() => import("@/app/[teamSlug]/[projectSlug]/settings/page"));
const AdminOverviewPage = lazy(() => import("@/app/admin/page"));
const AdminTeamsPage = lazy(() => import("@/app/admin/teams/page"));
const AdminRevenuePage = lazy(() => import("@/app/admin/revenue/page"));
const AdminPaymentsPage = lazy(() => import("@/app/admin/payments/page"));
const AdminUsersPage = lazy(() => import("@/app/admin/users/page"));
const AdminPlansPage = lazy(() => import("@/app/admin/plans/page"));
const AdminAIUsagePage = lazy(() => import("@/app/admin/ai-usage/page"));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
}

const OFFLINE_SUPPORTED_PATHS = new Set([
  "/dashboard",
  "/my-tasks",
  "/offline",
]);

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }

    return navigator.onLine;
  });

  useEffect(() => {
    const syncOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    syncOnlineStatus();

    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  return isOnline;
}

class RouteLoadBoundary extends Component<
  { children: ReactNode; isOnline: boolean },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      if (!this.props.isOnline) {
        return <OfflinePage />;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm space-y-3">
            <p className="text-sm font-semibold text-slate-900">Couldn&apos;t load this page.</p>
            <p className="text-sm leading-6 text-slate-500">Please refresh and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PromiseParamsRoute<T extends Record<string, string | undefined>>({
  component: Component,
  params,
}: {
  component: React.ComponentType<{ params: Promise<T> }>;
  params: T;
}) {
  return <Component params={Promise.resolve(params)} />;
}

function TeamMembersRoute() {
  const params = useParams<{ teamSlug: string }>();
  return <PromiseParamsRoute component={TeamMembersPage} params={{ teamSlug: params.teamSlug ?? "" }} />;
}

function TeamSettingsRoute() {
  const params = useParams<{ teamSlug: string }>();
  return <PromiseParamsRoute component={TeamSettingsPage} params={{ teamSlug: params.teamSlug ?? "" }} />;
}

function TeamProjectRoute() {
  const params = useParams<{ teamSlug: string; projectSlug: string }>();
  return (
    <PromiseParamsRoute
      component={TeamProjectPage}
      params={{ teamSlug: params.teamSlug ?? "", projectSlug: params.projectSlug ?? "" }}
    />
  );
}

function TeamProjectSettingsRoute() {
  const params = useParams<{ teamSlug: string; projectSlug: string }>();
  return (
    <PromiseParamsRoute
      component={TeamProjectSettingsPage}
      params={{ teamSlug: params.teamSlug ?? "", projectSlug: params.projectSlug ?? "" }}
    />
  );
}

function DashboardProjectLegacyRoute() {
  const params = useParams<{ id: string }>();
  return <PromiseParamsRoute component={ProjectDetailPage} params={{ id: params.id ?? "" }} />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <OfflineAwareRoutes />
      </AppShell>
    </BrowserRouter>
  );
}

function OfflineAwareRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOfflineUnsupportedRoute = !isOnline && !OFFLINE_SUPPORTED_PATHS.has(location.pathname);

  useEffect(() => {
    if (isOfflineUnsupportedRoute) {
      navigate("/offline", { replace: true });
    }
  }, [isOfflineUnsupportedRoute, navigate]);

  if (isOfflineUnsupportedRoute) {
    return <OfflinePage />;
  }

  return (
    <RouteLoadBoundary key={location.pathname} isOnline={isOnline}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-request" element={<VerifyRequestPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/google" element={<GoogleAuthPage />} />
          <Route path="/project-invite" element={<ProjectInvitePage />} />
          <Route path="/invite/:code" element={<InvitePage />} />
          <Route path="/invites/team/:token" element={<TeamInvitePage />} />
          <Route path="/invites/project/:token" element={<ProjectInviteTokenPage />} />

          <Route element={<DashboardLayoutRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/teams/create" element={<CreateTeamPage />} />
            <Route path="/dashboard/projects/:id" element={<DashboardProjectLegacyRoute />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/:teamSlug" element={<TeamDashboardPage />} />
            <Route path="/:teamSlug/activity" element={<TeamActivityPage />} />
            <Route path="/:teamSlug/members" element={<TeamMembersRoute />} />
            <Route path="/:teamSlug/settings" element={<TeamSettingsRoute />} />
            <Route path="/:teamSlug/:projectSlug/settings" element={<TeamProjectSettingsRoute />} />
            <Route path="/:teamSlug/:projectSlug" element={<TeamProjectRoute />} />
          </Route>

          <Route path="/admin" element={<AdminLayoutRoute />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="teams" element={<AdminTeamsPage />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="ai-usage" element={<AdminAIUsagePage />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteLoadBoundary>
  );
}
