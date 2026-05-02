import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { AuthCodeRescue } from "@/components/auth/AuthCodeRescue";
import { Providers } from "@/components/providers";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "https://www.getrisknova.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RiskNova",
    template: "%s | RiskNova",
  },
  description: "AI destekli İSG risk analizi ve operasyon platformu.",
  manifest: "/manifest.webmanifest",
  applicationName: "RiskNova",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RiskNova",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo/risknova-favicon-64.svg", type: "image/svg+xml" },
      { url: "/logo/risknova-mail-symbol.png", sizes: "1000x1000", type: "image/png" },
    ],
    apple: [{ url: "/logo/risknova-mail-symbol.png", sizes: "1000x1000", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "RiskNova",
    "msapplication-TileColor": "#0f172a",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  colorScheme: "light dark",
};

/**
 * Inline script that runs before React hydration to prevent flash.
 * Reads theme preference from localStorage and applies data-theme attribute.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('risknova-theme');
    var root = document.documentElement;
    if (t === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      return;
    }
    if (t === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
      return;
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers locale={locale} messages={messages}>
          <PwaRuntime />
          <AuthCodeRescue />
          {children}
        </Providers>
      </body>
    </html>
  );
}
