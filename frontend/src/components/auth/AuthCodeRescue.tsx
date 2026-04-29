"use client";

import { useEffect } from "react";

const FALLBACK_PRODUCTION_ORIGIN = "https://getrisknova.com";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveConfiguredOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;

  const normalized = configured.replace(/\/+$/, "");
  if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
    return null;
  }

  return normalized;
}

export function AuthCodeRescue() {
  useEffect(() => {
    const { hostname, origin, pathname, search } = window.location;
    const params = new URLSearchParams(search);
    const code = params.get("code");

    if (
      !code ||
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/auth/session-recover")
    ) {
      return;
    }

    const targetOrigin = isLocalHost(hostname)
      ? (resolveConfiguredOrigin() ?? FALLBACK_PRODUCTION_ORIGIN)
      : origin;

    const targetUrl = new URL("/auth/callback", targetOrigin);
    params.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    window.location.replace(targetUrl.toString());
  }, []);

  return null;
}
