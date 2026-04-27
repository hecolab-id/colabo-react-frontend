"use client";

import { useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import AppLink from "@/components/app-link";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forgotPassword } from "@/lib/api";

const forgotPasswordSchema = Yup.object({
  email: Yup.string().email("Please enter a valid email address").required("Email is required"),
});

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (
    values: { email: string },
    { setSubmitting }: { setSubmitting: (value: boolean) => void },
  ) => {
    setServerError(null);

    try {
      await forgotPassword(values.email);
      setSubmittedEmail(values.email.trim());
    } catch (err: any) {
      let message = "We couldn't send the reset link. Please try again.";

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

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your account email and we’ll send a secure reset link to get you back into Colabo."
      className="max-w-[540px]"
    >
      {submittedEmail ? (
        <Alert variant="success" className="space-y-3 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            If <span className="font-semibold text-slate-900">{submittedEmail}</span> is registered, a reset link is on its way.
          </AlertDescription>
          <AlertDescription>
            The link opens your password reset page and expires automatically for safety.
          </AlertDescription>
          <div className="pt-2">
            <AppLink href="/login" className={cn(buttonVariants({ size: "md" }), "rounded-[1rem] px-5")}>
              Back to login
            </AppLink>
          </div>
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

          <Formik initialValues={{ email: "" }} validationSchema={forgotPasswordSchema} onSubmit={handleSubmit}>
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-4">
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

                <Button type="submit" size="lg" className="w-full rounded-[1.2rem]" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "Sending reset link..." : "Send reset link"}
                </Button>
              </Form>
            )}
          </Formik>

          <p className="text-center text-[14px] text-slate-500">
            Remembered your password?{" "}
            <AppLink href="/login" className="font-semibold text-slate-950 transition-colors hover:text-slate-700">
              Sign in
            </AppLink>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
