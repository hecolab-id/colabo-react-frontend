import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { AdminLayoutRoute, DashboardLayoutRoute } from "@/routes/layouts";
import { GoogleAuthPage } from "@/routes/google-auth-page";

const DashboardPage = lazy(() => import("@/app/dashboard/page"));
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
const MyTasksPage = lazy(() => import("@/app/my-tasks/page"));
const OfflinePage = lazy(() => import("@/app/offline/page"));
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
const AdminOverviewPage = lazy(() => import("@/app/admin/page"));
const AdminTeamsPage = lazy(() => import("@/app/admin/teams/page"));
const AdminRevenuePage = lazy(() => import("@/app/admin/revenue/page"));
const AdminPaymentsPage = lazy(() => import("@/app/admin/payments/page"));
const AdminUsersPage = lazy(() => import("@/app/admin/users/page"));
const AdminPlansPage = lazy(() => import("@/app/admin/plans/page"));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
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

function DashboardProjectLegacyRoute() {
  const params = useParams<{ id: string }>();
  return <PromiseParamsRoute component={ProjectDetailPage} params={{ id: params.id ?? "" }} />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
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
              <Route path="/:teamSlug/:projectSlug" element={<TeamProjectRoute />} />
            </Route>

            <Route path="/admin" element={<AdminLayoutRoute />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="plans" element={<AdminPlansPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
