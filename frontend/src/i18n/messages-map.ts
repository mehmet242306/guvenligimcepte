import type { AbstractIntlMessages } from "next-intl";
import ar from "../../messages/ar.json";
import az from "../../messages/az.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import hi from "../../messages/hi.json";
import id from "../../messages/id.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import ru from "../../messages/ru.json";
import tr from "../../messages/tr.json";
import zh from "../../messages/zh.json";
import type { Locale } from "./routing";

/**
 * Bundled messages per locale (explicit imports so all locales stay in the client/server graph).
 * Used by `next-intl` server config and by `global-error.tsx` (no layout providers there).
 */
export const messagesByLocale: Record<Locale, AbstractIntlMessages> = {
  tr: tr as unknown as AbstractIntlMessages,
  en: en as unknown as AbstractIntlMessages,
  ar: ar as unknown as AbstractIntlMessages,
  ru: ru as unknown as AbstractIntlMessages,
  de: de as unknown as AbstractIntlMessages,
  fr: fr as unknown as AbstractIntlMessages,
  es: es as unknown as AbstractIntlMessages,
  zh: zh as unknown as AbstractIntlMessages,
  ja: ja as unknown as AbstractIntlMessages,
  ko: ko as unknown as AbstractIntlMessages,
  hi: hi as unknown as AbstractIntlMessages,
  az: az as unknown as AbstractIntlMessages,
  id: id as unknown as AbstractIntlMessages,
};
