"use client";

import { usePathname } from "next/navigation";
import { PwaInstallPrompt } from "./pwa-install-prompt";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-and-conditions",
  "/cookie-policy",
  "/refund-policy",
  "/cozumler",
  "/uygulama",
  "/auth",
  "/share",
  "/survey",
  "/certificate",
  "/invite",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)));
}

export function PwaAppInstallPrompt() {
  const pathname = usePathname() || "/";

  if (isPublicPath(pathname)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end">
      <PwaInstallPrompt
        surface="app"
        className="pointer-events-auto w-full max-w-sm shadow-[0_18px_50px_rgba(15,23,42,0.28)]"
      />
    </div>
  );
}
