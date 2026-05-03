import type { JSONContent } from "@tiptap/react";

/** Partial override for a TipTap document template (locale-specific). */
export type DocumentTemplateLocalePatch = {
  title?: string;
  description?: string;
  content?: JSONContent;
};

export type DocumentTemplateLocaleBundle = Record<string, DocumentTemplateLocalePatch>;
