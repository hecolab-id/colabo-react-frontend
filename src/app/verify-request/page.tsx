"use client";

import { useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendVerificationEmail } from "@/lib/api";
import { useStore } from "@/lib/store";
import { toast } from "@/components/ui/toast";

export default function VerifyRequestPage() {
  const { user, logout, refreshUser } = useStore();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  };

  const handleResend = async () => {
    setSending(true);
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't resend the email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      description="Confirm your address before entering the workspace. We’ll keep this flow lightweight and safe."
      className="max-w-[540px]"
    >
      <div className="space-y-5">
        <Alert variant="default" className="p-5">
          <AlertDescription className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <p className="font-medium text-slate-900">
              Hi {user?.name || "there"}, please verify <span className="font-semibold">{user?.email}</span> to continue using Colabo.
            </p>
            <p>Once you confirm the inbox, this page will let you move straight back into the product.</p>
          </AlertDescription>
        </Alert>

        {sent ? (
          <Alert variant="success">
            <AlertDescription>Verification email sent. Check your inbox, then come back here and confirm once it’s verified.</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <Button onClick={handleResend} disabled={sent || sending} size="lg" className="w-full rounded-[1.2rem]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {sent ? "Email sent" : sending ? "Sending..." : "Resend verification email"}
          </Button>

          <Button
            onClick={handleCheckVerification}
            disabled={checking}
            variant="secondary"
            size="lg"
            className="w-full rounded-[1.2rem]"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            I have verified my email
          </Button>

          <button
            type="button"
            onClick={() => logout()}
            className="mx-auto flex min-h-11 items-center px-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 md:min-h-0 md:px-0"
          >
            Sign out
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
