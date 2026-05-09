import type { AbstractIntlMessages } from "next-intl";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";
import type { Locale } from "./routing";

/**
 * Bundled messages per locale (explicit imports so all locales stay in the client/server graph).
 * Used by `next-intl` server config and by `global-error.tsx` (no layout providers there).
 */
export const messagesByLocale: Record<Locale, AbstractIntlMessages> = {
  tr: tr as unknown as AbstractIntlMessages,
  en: en as unknown as AbstractIntlMessages,
};
