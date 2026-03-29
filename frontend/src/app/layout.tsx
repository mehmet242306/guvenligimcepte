import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RiskNova",
    template: "%s | RiskNova",
  },
  description: "AI destekli \u0130SG risk analizi ve operasyon platformu.",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
