"use client";

import { Suspense, useMemo, useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { AlertCircle, Loader2, Lock, Mail, User2 } from "lucide-react";
import AppLink from "@/components/app-link";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useStore } from "@/lib/store";

const registerSchema = Yup.object({
  name: Yup.string().min(2, "Name must be at least 2 characters").required("Name is required"),
  email: Yup.string().email("Please enter a valid email address").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

function RegisterPageContent() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useStore((state) => state.register);

  const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect");
  const inviteType = searchParams.get("inviteType");
  const teamName = searchParams.get("teamName");
  const inviterName = searchParams.get("inviterName");
  const inviteEmail = searchParams.get("inviteEmail");

  const loginHref = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (returnUrl && !nextParams.get("redirect")) {
      nextParams.set("redirect", returnUrl);
    }
    return `/login${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;
  }, [returnUrl, searchParams]);

  const handleSubmit = async (
    values: { name: string; email: string; password: string },
    { setSubmitting }: { setSubmitting: (value: boolean) => void },
  ) => {
    setServerError(null);
    try {
      await register(values.name, values.email, values.password);
      router.push(returnUrl || "/dashboard");
    } catch (err: any) {
      let message = "Registration failed. Please try again.";

      if (err.response?.data) {
        const data = err.response.data;
        if (data.errors && typeof data.errors === "object") {
          message = String(Object.values(data.errors)[0]);
        } else if (data.message && data.message !== "Bad Request") {
          message = data.message;
        } else if (err.response.status === 409) {
          message = "Email already exists";
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
      title="Create your account"
      description="Set up your workspace access with the same calm system you’ll use across projects, tasks, and teams."
    >
      <div className="space-y-6">
        {inviteType === "team" && teamName ? (
          <Alert variant="success">
            <AlertDescription className="space-y-2 break-words">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Team Invitation
              </p>
              <p className="font-medium text-slate-900">You&apos;ve been invited to join the {teamName} team.</p>
              <p>{inviterName ? `${inviterName} invited you. Create your account to continue.` : "Create your account to continue."}</p>
              {inviteEmail ? (
                <p>
                  Sign up with <span className="font-semibold text-slate-900">{inviteEmail}</span> to match the invited email.
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

        <Formik
          initialValues={{ name: "", email: inviteEmail || "", password: "" }}
          validationSchema={registerSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="space-y-4">
              <Field name="name">
                {({ field }: any) => (
                  <AuthField
                    {...field}
                    type="text"
                    label="Name"
                    placeholder="John Doe"
                    icon={<User2 className="h-4 w-4" />}
                    error={touched.name ? errors.name : undefined}
                  />
                )}
              </Field>
              <ErrorMessage name="name" component="div" className="hidden" />

              <Field name="email">
                {({ field }: any) => (
                  <AuthField
                    {...field}
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={<Mail className="h-4 w-4" />}
                    error={touched.email ? errors.email : undefined}
                  />
                )}
              </Field>
              <ErrorMessage name="email" component="div" className="hidden" />

              <Field name="password">
                {({ field }: any) => (
                  <AuthField
                    {...field}
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    icon={<Lock className="h-4 w-4" />}
                    error={touched.password ? errors.password : undefined}
                  />
                )}
              </Field>
              <ErrorMessage name="password" component="div" className="hidden" />

              <Button type="submit" size="lg" className="w-full rounded-[1.2rem]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </Form>
          )}
        </Formik>

        <AuthDivider />
        <GoogleAuthButton />

        <p className="text-center text-[14px] text-slate-500">
          Already have an account?{" "}
          <AppLink href={loginHref} className="font-semibold text-slate-950 transition-colors hover:text-slate-700">
            Sign in
          </AppLink>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
