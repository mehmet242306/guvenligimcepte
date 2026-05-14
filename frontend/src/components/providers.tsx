"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider, type Messages } from "next-intl";
import { AccessibilityAppShell } from "@/components/accessibility/accessibility-app-shell";
import { I18nProvider } from "@/lib/i18n";

type Props = {
  children: ReactNode;
  locale: string;
  messages: Messages;
};

export function Providers({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      messages={messages}
      timeZone="Europe/Istanbul"
    >
      <I18nProvider>
        <AccessibilityAppShell>{children}</AccessibilityAppShell>
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
