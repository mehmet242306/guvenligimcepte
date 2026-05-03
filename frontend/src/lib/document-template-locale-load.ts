import type { DocumentTemplateLocaleBundle, DocumentTemplateLocalePatch } from "./document-template-locale-types";

import ar from "./document-template-locales/bundles/ar.json";
import az from "./document-template-locales/bundles/az.json";
import de from "./document-template-locales/bundles/de.json";
import en from "./document-template-locales/bundles/en.json";
import es from "./document-template-locales/bundles/es.json";
import fr from "./document-template-locales/bundles/fr.json";
import hi from "./document-template-locales/bundles/hi.json";
import id from "./document-template-locales/bundles/id.json";
import ja from "./document-template-locales/bundles/ja.json";
import ko from "./document-template-locales/bundles/ko.json";
import ru from "./document-template-locales/bundles/ru.json";
import zh from "./document-template-locales/bundles/zh.json";

const BUNDLES: Record<string, DocumentTemplateLocaleBundle> = {
  en: en as DocumentTemplateLocaleBundle,
  ar: ar as DocumentTemplateLocaleBundle,
  ru: ru as DocumentTemplateLocaleBundle,
  de: de as DocumentTemplateLocaleBundle,
  fr: fr as DocumentTemplateLocaleBundle,
  es: es as DocumentTemplateLocaleBundle,
  zh: zh as DocumentTemplateLocaleBundle,
  ja: ja as DocumentTemplateLocaleBundle,
  ko: ko as DocumentTemplateLocaleBundle,
  hi: hi as DocumentTemplateLocaleBundle,
  az: az as DocumentTemplateLocaleBundle,
  id: id as DocumentTemplateLocaleBundle,
};

/**
 * Returns a locale patch for `templateId`, or undefined if none.
 * Does not fall back to English — callers should chain `en` if needed.
 */
export function getDocumentTemplateLocalePatch(
  locale: string,
  templateId: string,
): DocumentTemplateLocalePatch | undefined {
  const bundle = BUNDLES[locale];
  return bundle?.[templateId];
}
