"use client";

import { Suspense, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import AppLink from "@/components/app-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { verifyEmail } from "@/lib/api";
import { useStore } from "@/lib/store";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    verifyEmail(token)
      .then(async () => {
        await refreshUser();
        setStatus("success");
      })
      .catch((err) => {
        console.error(err);
        setStatus("error");
        setError(err.response?.data?.message || "Failed to verify email. The token may be invalid or expired.");
      });
  }, [refreshUser, token]);

  if (status === "loading") {
    return (
      <AuthShell
        title="Verifying email"
        description="We’re confirming your verification token and syncing your session."
        className="max-w-[540px]"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (status === "error") {
    return (
      <AuthShell
        title="Verification failed"
        description="This token could not be confirmed. You can return to login and request another verification email."
        className="max-w-[540px]"
      >
        <Alert variant="danger" className="space-y-3 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
          <AlertTitle>Verification failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="pt-2">
            <AppLink href="/login" className={cn(buttonVariants({ size: "md" }), "rounded-[1rem] px-5")}>
              Back to login
            </AppLink>
          </div>
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Email verified"
      description="Your account is confirmed and ready to re-enter the workspace."
      className="max-w-[540px]"
    >
      <Alert variant="success" className="space-y-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
          <CheckCircle className="h-6 w-6" />
        </div>
        <AlertTitle>Email verified</AlertTitle>
        <AlertDescription>Thank you for verifying your email address. You can continue to your dashboard now.</AlertDescription>
        <div className="pt-2">
          <button
            type="button"
            className={cn(buttonVariants({ size: "md" }), "rounded-[1rem] px-5")}
            onClick={() => router.push("/dashboard")}
          >
            Go to dashboard
          </button>
        </div>
      </Alert>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
