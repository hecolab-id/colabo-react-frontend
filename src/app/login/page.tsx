"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { AlertCircle, Loader2 } from "lucide-react";
import AppLink from "@/components/app-link";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "@/lib/navigation";
import { useStore } from "@/lib/store";

const loginSchema = Yup.object({
  email: Yup.string().email("Please enter a valid email address").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "Your sign-in session expired. Please try signing in with Google again.",
  google_auth_failed: "We couldn't sign you in with Google. Please try again.",
  missing_tokens: "We couldn't sign you in with Google. Please try again.",
};

function LoginPageContent() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useStore((state) => state.login);

  const redirectTo = searchParams.get("redirect") || searchParams.get("returnUrl");
  const inviteType = searchParams.get("inviteType");
  const teamName = searchParams.get("teamName");
  const inviterName = searchParams.get("inviterName");
  const inviteEmail = searchParams.get("inviteEmail");
  const errorCode = searchParams.get("error");

  useEffect(() => {
    if (errorCode && AUTH_ERROR_MESSAGES[errorCode]) {
      setServerError(AUTH_ERROR_MESSAGES[errorCode]);
    }
  }, [errorCode]);

  const registerHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (redirectTo && !nextParams.get("returnUrl")) {
      nextParams.set("returnUrl", redirectTo);
    }
    return `/register${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;
  }, [redirectTo, searchParams]);

  const handleSubmit = async (
    values: { email: string; password: string },
    { setSubmitting }: { setSubmitting: (value: boolean) => void },
  ) => {
    setServerError(null);

    try {
      await login(values.email, values.password);
      router.push(redirectTo || "/dashboard");
    } catch (err: any) {
      let message = "Login failed. Please try again.";

      if (err.response?.data) {
        const data = err.response.data;
        if (data.errors && typeof data.errors === "object") {
          message = String(Object.values(data.errors)[0]);
        } else if (data.message && data.message !== "Bad Request") {
          message = data.message;
        } else if (err.response.status === 401) {
          message = "Invalid email or password";
        }
      } else if (err.message) {
        message = err.message;
      }

      setServerError(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      simple
      title="Welcome back"
      description="Sign in to your Colabo account."
    >
      <div className="space-y-6">
        {inviteType === "team" && teamName ? (
          <Alert variant="success">
            <AlertDescription className="space-y-2 break-words">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Team Invitation
              </p>
              <p className="font-medium text-slate-900">You&apos;ve been invited to join the {teamName} team.</p>
              <p>
                {inviterName
                  ? `${inviterName} invited you. Log in or sign up to continue.`
                  : "Log in or sign up to continue."}
              </p>
              {inviteEmail ? (
                <p>
                  Continue with <span className="font-semibold text-slate-900">{inviteEmail}</span> to match the invited email.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="danger">
            <AlertDescription className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{serverError}</p>
            </AlertDescription>
          </Alert>
        ) : null}

        <Formik initialValues={{ email: inviteEmail || "", password: "" }} validationSchema={loginSchema} onSubmit={handleSubmit}>
          {({ isSubmitting, errors, touched }) => (
            <Form noValidate className="space-y-5">
              <Field name="email">
                {({ field }: any) => (
                  <AuthField
                    simple
                    {...field}
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    label="Email"
                    placeholder="you@example.com"
                    error={touched.email ? errors.email : undefined}
                  />
                )}
              </Field>

              <Field name="password">
                {({ field }: any) => (
                  <AuthField
                    simple
                    {...field}
                    type="password"
                    autoComplete="current-password"
                    label="Password"
                    placeholder="Enter your password"
                    labelAction={
                      <AppLink href="/forgot-password" className="inline-flex min-h-6 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                        Forgot password?
                      </AppLink>
                    }
                    error={touched.password ? errors.password : undefined}
                  />
                )}
              </Field>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </Form>
          )}
        </Formik>

        <AuthDivider />
        <GoogleAuthButton />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <AppLink href={registerHref} className="inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            Sign up
          </AppLink>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageContent />
    </Suspense>
  );
}
