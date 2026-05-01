"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import { isTurkeyWorkspace } from "@/lib/workspace/jurisdiction";

type Props = {
  children: ReactNode;
  redirectTo?: string;
};

/**
 * Renders children only when the active workspace is Turkey (TR).
 * Otherwise redirects (default /dashboard). Used for Turkey-specific modules.
 */
export function TurkeyOnlyLayoutGate({ children, redirectTo = "/dashboard" }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "allow" | "deny">("loading");

  useEffect(() => {
    let cancelled = false;

    function onWorkspaceChanged() {
      void resolve();
    }

    async function resolve() {
      setPhase("loading");
      const ws = await getActiveWorkspace();
      const code = ws?.country_code ?? null;
      if (cancelled) return;
      if (code === null) {
        setPhase("allow");
        return;
      }
      if (!isTurkeyWorkspace(code)) {
        setPhase("deny");
        router.replace(redirectTo);
        return;
      }
      setPhase("allow");
    }

    void resolve();

    window.addEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    };
  }, [redirectTo, router]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (phase === "deny") return null;
  return <>{children}</>;
}
