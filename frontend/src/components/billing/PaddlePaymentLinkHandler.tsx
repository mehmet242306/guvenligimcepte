"use client";

import Script from "next/script";
import { useCallback, useState } from "react";

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: "sandbox" | "production") => void;
      };
      Initialize: (options: {
        token: string;
        checkout?: {
          settings?: {
            displayMode?: "overlay" | "inline";
            theme?: "light" | "dark";
            locale?: string;
          };
        };
      }) => void;
      Checkout?: {
        open: (options: {
          transactionId: string;
          settings?: {
            displayMode?: "overlay" | "inline";
            theme?: "light" | "dark";
            locale?: string;
          };
        }) => void;
      };
    };
    __risknovaPaddleInitialized?: boolean;
  }
}

const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();

function getPaymentLinkTransactionId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("_ptxn");
}

export function PaddlePaymentLinkHandler() {
  const [error, setError] = useState<string | null>(null);

  const initializePaddle = useCallback(() => {
    const transactionId = getPaymentLinkTransactionId();

    if (!paddleClientToken) {
      if (transactionId) {
        setError("Paddle client token tanimli degil.");
      }
      return;
    }

    if (!window.Paddle) {
      if (transactionId) {
        setError("Paddle.js yuklenemedi.");
      }
      return;
    }

    try {
      if (paddleClientToken.startsWith("test_")) {
        window.Paddle.Environment?.set("sandbox");
      }

      if (!window.__risknovaPaddleInitialized) {
        window.Paddle.Initialize({
          token: paddleClientToken,
          checkout: {
            settings: {
              displayMode: "overlay",
              theme: "light",
              locale: "tr",
            },
          },
        });
        window.__risknovaPaddleInitialized = true;
      }

      if (transactionId) {
        window.Paddle.Checkout?.open({
          transactionId,
          settings: {
            displayMode: "overlay",
            theme: "light",
            locale: "tr",
          },
        });
      }
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Paddle checkout acilamadi.",
      );
    }
  }, []);

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={initializePaddle}
        onError={() => setError("Paddle.js yuklenemedi.")}
      />
      {error ? (
        <div className="mx-auto mt-4 w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        </div>
      ) : null}
    </>
  );
}
