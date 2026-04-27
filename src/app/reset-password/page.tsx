"use client";

import { Suspense, useMemo, useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import AppLink from "@/components/app-link";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { resetPassword } from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const schema = useMemo(
    () =>
      Yup.object({
        password: Yup.string()
          .min(8, "Password must be at least 8 characters")
          .matches(/[A-Za-z]/, "Password must include a letter")
          .matches(/[0-9]/, "Password must include a number")
          .required("Password is required"),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref("password")], "Passwords do not match")
          .required("Please confirm your password"),
      }),
    [],
  );

  const handleSubmit = async (
    values: { password: string; confirmPassword: string },
    { setSubmitting }: { setSubmitting: (value: boolean) => void },
  ) => {
    if (!token) {
      setServerError("Missing reset token. Please request a new password reset link.");
      setSubmitting(false);
      return;
    }

    setServerError(null);

    try {
      await resetPassword(token, values.password);
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err: any) {
      let message = "Failed to reset password. The link may be invalid or expired.";

      if (err.response?.data) {
        const data = err.response.data;
        if (data.errors && typeof data.errors === "object") {
          message = String(Object.values(data.errors)[0]);
        } else if (data.message && data.message !== "Bad Request") {
          message = data.message;
        }
      } else if (err.message) {
        message = err.message;
      }

      setServerError(message);
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Reset link missing"
        description="This page needs a valid reset token. Request a fresh link and try again."
        className="max-w-[540px]"
      >
        <AppLink href="/forgot-password" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-[1.2rem]")}>
          Request new link
        </AppLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create a new password"
      description="Choose a new password for your account. This reset link can only be used once."
      className="max-w-[540px]"
    >
      {isSuccess ? (
        <Alert variant="success" className="space-y-3 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>
            Your password has been reset successfully. Redirecting you to login.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {serverError ? (
            <Alert variant="danger">
              <AlertDescription className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{serverError}</p>
              </AlertDescription>
            </Alert>
          ) : null}

          <Formik initialValues={{ password: "", confirmPassword: "" }} validationSchema={schema} onSubmit={handleSubmit}>
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-4">
                <Field name="password">
                  {({ field }: any) => (
                    <AuthField
                      {...field}
                      type="password"
                      label="New Password"
                      placeholder="••••••••"
                      icon={<Lock className="h-4 w-4" />}
                      error={touched.password ? errors.password : undefined}
                    />
                  )}
                </Field>
                <ErrorMessage name="password" component="div" className="hidden" />

                <Field name="confirmPassword">
                  {({ field }: any) => (
                    <AuthField
                      {...field}
                      type="password"
                      label="Confirm Password"
                      placeholder="••••••••"
                      icon={<Lock className="h-4 w-4" />}
                      error={touched.confirmPassword ? errors.confirmPassword : undefined}
                    />
                  )}
                </Field>
                <ErrorMessage name="confirmPassword" component="div" className="hidden" />

                <Button type="submit" size="lg" className="w-full rounded-[1.2rem]" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "Updating password..." : "Update password"}
                </Button>
              </Form>
            )}
          </Formik>

          <p className="text-center text-[14px] text-slate-500">
            Back to{" "}
            <AppLink href="/login" className="font-semibold text-slate-950 transition-colors hover:text-slate-700">
              login
            </AppLink>
          </p>
        </div>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
