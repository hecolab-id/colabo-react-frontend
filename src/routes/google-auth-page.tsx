import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export function GoogleAuthPage() {
  useEffect(() => {
    window.location.href = `${apiUrl}/v1/auth/google`;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 rounded-full border border-black/5 bg-white/80 px-5 py-3 shadow-sm backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting to Google...
      </div>
    </div>
  );
}
