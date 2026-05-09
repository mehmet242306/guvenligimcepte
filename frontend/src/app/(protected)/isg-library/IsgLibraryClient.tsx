"use client";

/**
 * ISG Library — operational template hub.
 *
 * Re-architected to behave less like a document repository and more like a
 * starter / template / institutional-memory surface that:
 *  - never shows an empty screen (starter cards seeded per category)
 *  - drops categories that already have their own modules (Eğitim, Sınav&Anket,
 *    Form&Checklist, Mevzuat) and redirects legacy URLs to those modules
 *  - lets users create their own main categories (Hastane Operasyonları,
 *    Kimyasal Güvenlik, Yaşlı Bakım Merkezi …) saved in localStorage
 *  - wires AI-draft starters into the document editor's existing Nova flow
 *    (`/documents/new?ai=1&aiPrompt=…`) so the AI assistant can pick them up
 *  - keeps the existing premium look (gold rim, soft shadows, rounded shells)
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { JSONContent } from "@tiptap/react";
import {
  ArrowUpRight,
  Boxes,
  Briefcase,
  Building2,
  Check,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  FilePenLine,
  Filter,
  LayoutGrid,
  Plus,
  Search,
  ScrollText,
  ShieldAlert,
  Siren,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_GROUPS, getGroupByKey } from "@/lib/document-groups";
import { getTemplate } from "@/lib/document-templates-p1";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, fetchDocuments, type DocumentRecord } from "@/lib/supabase/document-api";
import {
  assignLibraryContentToCompany,
  fetchCompanyLibraryItems,
  fetchLibraryContents,
  removeLibraryContentFromCompany,
  type CompanyLibraryItemRecord,
  type LibraryContentRecord,
} from "@/lib/supabase/isg-library-api";
import { fetchCompaniesFromSupabase } from "@/lib/supabase/company-api";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import { cn } from "@/lib/utils";
import {
  ALL_CATEGORY_LABEL,
  ALL_SUBCATEGORIES_KEY,
  ALL_SUBCATEGORIES_LABEL,
  BUILTIN_CATEGORIES,
  CATEGORY_TONE_CLASSES,
  CUSTOM_CATEGORY_STORAGE_KEY,
  LEGACY_SECTION_REDIRECTS,
  STARTER_TEMPLATES,
  getSubcategoriesForCategory,
  librarySlugify,
  pickLocalized,
  type BuiltinCategoryKey,
  type CategoryIconKey,
  type CategoryKey,
  type CustomCategoryRecord,
  type LibraryCategoryDefinition,
  type StarterAction,
} from "./library-config";

const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  FileText,
  Siren,
  ScrollText,
  Briefcase,
  Workflow,
  ShieldAlert,
  ClipboardCheck,
  Boxes,
  Sparkles,
  Users,
};

const ISG_LIBRARY_DATE_LOCALE: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  ar: "ar-SA",
  ru: "ru-RU",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  az: "az-AZ",
  id: "id-ID",
};

const MANAGE_ROLE_CODES = new Set([
  "super_admin",
  "platform_admin",
  "organization_admin",
  "osgb_manager",
  "ohs_specialist",
]);

type SortKey = "newest" | "oldest" | "az" | "za";

type CompanyOption = {
  id: string;
  legacyCompanyId?: string;
  name: string;
  sector: string;
  hazardClass: string;
  city: string;
};

type UserContext = {
  authUserId: string | null;
  profileId: string | null;
  fullName: string;
  canManageCatalog: boolean;
};

type ItemFlags = {
  ai?: boolean;
  corporate?: boolean;
  user?: boolean;
  operation?: boolean;
  risk?: boolean;
  audit?: boolean;
  process?: boolean;
};

type LibraryItem = {
  id: string;
  category: CategoryKey;
  /**
   * Subcategory slug under the parent category. `null` means "not anchored to
   * a specific subcategory" — these cards still show in the "All
   * subcategories" view but are filtered out when the user picks a specific
   * subcategory chip.
   */
  subcategoryKey?: string | null;
  customCategoryId?: string;
  title: string;
  description: string;
  contentType: string;
  sectorTags: string[];
  flags: ItemFlags;
  usageCount: number;
  source: "starter" | "catalog" | "document";
  createdAt: string;
  /** Single primary action (open / use). */
  primaryAction: StarterAction | { kind: "open"; href: string };
  /** Optional secondary action — usually a download. */
  downloadHref?: string | null;
  /** For catalog items, this is the row id used by `assign-to-company`. */
  libraryContentId?: string | null;
  /** For editor-saved documents, this is the document id. */
  documentId?: string | null;
  ownerId?: string | null;
  /** When set, the card shows the source's underlying TipTap template id. */
  templateId?: string | null;
  /** When set, indicates a document group (used for downloads / preview). */
  groupKey?: string | null;
};

type PreviewState = {
  title: string;
  description: string;
  content: JSONContent | null;
} | null;

type AiPromptDraft = {
  category: CategoryKey;
  prompt: string;
  title: string;
};

type DeleteMode = "starter-hide" | "company" | "document";

const STARTER_HIDE_STORAGE_KEY = "risknova:isg-library:hidden-starters:v1";

const SECTOR_DEFAULTS: { tr: string; en: string }[] = [
  { tr: "Genel", en: "General" },
  { tr: "İmalat", en: "Manufacturing" },
  { tr: "İnşaat", en: "Construction" },
  { tr: "Sağlık", en: "Healthcare" },
  { tr: "Hastane", en: "Hospital" },
  { tr: "Atölye", en: "Workshop" },
  { tr: "Saha", en: "Field" },
];

function getSortKey(value: string | null): SortKey {
  if (value === "oldest" || value === "az" || value === "za") return value;
  return "newest";
}

function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / disabled storage */
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineContent(content?: JSONContent["content"]): string {
  if (!content?.length) return "";
  return content
    .map((node) => {
      if (node.type !== "text") return "";
      let html = escapeHtml(node.text ?? "");
      const marks = node.marks ?? [];
      for (const mark of marks) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        if (mark.type === "italic") html = `<em>${html}</em>`;
        if (mark.type === "underline") html = `<u>${html}</u>`;
      }
      return html;
    })
    .join("");
}

function renderJsonNodeToHtml(node: JSONContent): string {
  const children = (node.content ?? []).map((child) => renderJsonNodeToHtml(child)).join("");
  const inline = renderInlineContent(node.content);

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${inline || children || "&nbsp;"}</p>`;
    case "heading":
      return `<h${node.attrs?.level ?? 2}>${inline || children}</h${node.attrs?.level ?? 2}>`;
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "table":
      return `<table><tbody>${children}</tbody></table>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableHeader":
      return `<th>${children || inline}</th>`;
    case "tableCell":
      return `<td>${children || inline}</td>`;
    case "horizontalRule":
      return "<hr />";
    case "text":
      return renderInlineContent([node]);
    default:
      return children || inline;
  }
}

function categoryFromUrl(value: string | null): CategoryKey {
  if (!value) return "all";
  if (value === "all") return "all";
  if (value.startsWith("custom:")) return value as CategoryKey;
  const slug = librarySlugify(value);
  const builtin = BUILTIN_CATEGORIES.find((c) => c.key === slug || librarySlugify(c.key) === slug);
  if (builtin) return builtin.key as CategoryKey;
  const legacy = LEGACY_SECTION_REDIRECTS[slug];
  if (legacy?.category) return legacy.category;
  return "all";
}

function categoryToUrl(category: CategoryKey): string {
  if (category === "all") return "";
  return category;
}

/** True when the saved DB category string maps onto our new schema. */
function inferLibraryCategory(rawCategory: string | null | undefined): BuiltinCategoryKey {
  if (!rawCategory) return "documentation";
  const slug = librarySlugify(rawCategory);
  const direct = BUILTIN_CATEGORIES.find((c) => c.key === slug);
  if (direct) return direct.key as BuiltinCategoryKey;
  const legacy = LEGACY_SECTION_REDIRECTS[slug];
  if (legacy?.category) return legacy.category;
  return "documentation";
}

function pickT(translator: (key: string) => string, key: string, fallback: string) {
  // next-intl throws on missing keys when configured strictly — cheap try/catch.
  try {
    const value = translator(key);
    return value && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Skeleton shown during loading
// ---------------------------------------------------------------------------
function LibraryGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 rounded-[2rem]" />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-11 min-w-32 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden border-border/70 bg-card/90">
            <CardHeader className="space-y-4">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-11 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function IsgLibraryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("isgLibrary");
  const locale = useLocale();
  const isTr = locale.startsWith("tr");
  const dateLocaleTag = ISG_LIBRARY_DATE_LOCALE[locale] ?? "en-US";

  // ---------- Legacy URL handling: redirect education / assessment / legal ----------
  const handledLegacyRedirect = useRef(false);
  useEffect(() => {
    if (handledLegacyRedirect.current) return;
    const sectionRaw = searchParams.get("section") ?? searchParams.get("category");
    if (!sectionRaw) return;
    const slug = librarySlugify(sectionRaw);
    const legacy = LEGACY_SECTION_REDIRECTS[slug];
    if (legacy?.module) {
      handledLegacyRedirect.current = true;
      router.replace(legacy.module);
    }
  }, [router, searchParams]);

  // ---------- Custom main categories (localStorage) ----------
  const [customCategories, setCustomCategories] = useState<CustomCategoryRecord[]>([]);
  useEffect(() => {
    setCustomCategories(readJsonFromStorage<CustomCategoryRecord[]>(CUSTOM_CATEGORY_STORAGE_KEY, []));
  }, []);
  useEffect(() => {
    writeJsonToStorage(CUSTOM_CATEGORY_STORAGE_KEY, customCategories);
  }, [customCategories]);

  // ---------- Hidden starter ids (so users can dismiss seeded cards) ----------
  const [hiddenStarterIds, setHiddenStarterIds] = useState<string[]>([]);
  useEffect(() => {
    setHiddenStarterIds(readJsonFromStorage<string[]>(STARTER_HIDE_STORAGE_KEY, []));
  }, []);
  useEffect(() => {
    writeJsonToStorage(STARTER_HIDE_STORAGE_KEY, hiddenStarterIds);
  }, [hiddenStarterIds]);

  // ---------- Filter state ----------
  const [category, setCategory] = useState<CategoryKey>(() =>
    categoryFromUrl(searchParams.get("category") ?? searchParams.get("section")),
  );
  // Active subcategory inside the selected main category. `ALL_SUBCATEGORIES_KEY`
  // means "show everything under the main category" and is the default whenever
  // the user lands on a category for the first time. We rebind the slug to one
  // of the category's actual subcategories on category change so a stale slug
  // from URL doesn't leak across categories.
  const [subcategory, setSubcategory] = useState<string>(
    () => searchParams.get("sub") ?? ALL_SUBCATEGORIES_KEY,
  );
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sectorFilter, setSectorFilter] = useState(() => searchParams.get("sector") ?? "all");
  const [sortBy, setSortBy] = useState<SortKey>(() => getSortKey(searchParams.get("sort")));
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get("saved") === "1");

  // ---------- Data ----------
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [userContext, setUserContext] = useState<UserContext>({
    authUserId: null,
    profileId: null,
    fullName: pickT(t, "user.defaultDisplayName", isTr ? "RiskNova Kullanıcısı" : "RiskNova user"),
    canManageCatalog: false,
  });
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  // Active workspace ID — sourced from the global workspace switcher (header bar).
  // The page no longer offers its own company selector; we follow the active
  // workspace so users only manage that choice in one place.
  const [creationCompanyId, setCreationCompanyId] = useState("");
  const [contents, setContents] = useState<LibraryContentRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [savedItems, setSavedItems] = useState<CompanyLibraryItemRecord[]>([]);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignContent, setAssignContent] = useState<LibraryContentRecord | null>(null);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>(null);

  const [aiDraft, setAiDraft] = useState<AiPromptDraft | null>(null);
  const [aiDraftSubmitting, setAiDraftSubmitting] = useState(false);

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [importingDocument, setImportingDocument] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---------- Build category list (built-in + custom) ----------
  const categoryDefinitions = useMemo<LibraryCategoryDefinition[]>(() => {
    const base = BUILTIN_CATEGORIES.map((category) => ({
      ...category,
      label: { ...category.label },
    }));
    const customs: LibraryCategoryDefinition[] = customCategories.map((custom) => ({
      key: `custom:${custom.id}` as CategoryKey,
      iconKey: "Users",
      tone: "sky" as const,
      label: { tr: custom.label, en: custom.label },
      description: {
        tr: custom.description ?? "Özel kategori — kendi başlangıç şablonlarınızı buraya kaydedin.",
        en: custom.description ?? "Custom category — save your own starter templates here.",
      },
    }));
    return [...base, ...customs];
  }, [customCategories]);

  // ---------- Subcategories of the active category ----------
  const activeSubcategories = useMemo(
    () => getSubcategoriesForCategory(category, categoryDefinitions),
    [category, categoryDefinitions],
  );

  // When the user switches main category, drop any stale subcategory selection.
  // We don't reset to "all" if the URL already pointed at a valid subcategory
  // for this category (deep-link case handled implicitly by initial state).
  useEffect(() => {
    if (subcategory === ALL_SUBCATEGORIES_KEY) return;
    if (activeSubcategories.some((entry) => entry.key === subcategory)) return;
    setSubcategory(ALL_SUBCATEGORIES_KEY);
  }, [activeSubcategories, subcategory]);

  // ---------- URL sync ----------
  useEffect(() => {
    const params = new URLSearchParams();
    const cat = categoryToUrl(category);
    if (cat) params.set("category", cat);
    if (subcategory && subcategory !== ALL_SUBCATEGORIES_KEY) params.set("sub", subcategory);
    if (query.trim()) params.set("q", query.trim());
    if (sectorFilter !== "all") params.set("sector", sectorFilter);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (savedOnly) params.set("saved", "1");
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url);
  }, [category, pathname, query, router, savedOnly, sectorFilter, sortBy, subcategory]);

  // ---------- Status auto-hide ----------
  useEffect(() => {
    if (!statusMessage) return undefined;
    const handle = window.setTimeout(() => setStatusMessage(null), 3200);
    return () => window.clearTimeout(handle);
  }, [statusMessage]);

  // ---------- Initial data load ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setErrorMessage(pickT(t, "errors.supabaseConnect", isTr ? "Supabase bağlantısı kurulamadı." : "Supabase connection failed."));
          setLoading(false);
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setErrorMessage(pickT(t, "errors.sessionNotFound", isTr ? "Oturum bulunamadı." : "Session not found."));
          setLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, organization_id, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profileError || !profile?.organization_id) {
        if (!cancelled) {
          setErrorMessage(pickT(t, "errors.profileLoadFailed", isTr ? "Profil yüklenemedi." : "Profile load failed."));
          setLoading(false);
        }
        return;
      }

      const [rolesResponse, companyRows, libraryResponse, documentsResponse] = await Promise.all([
        supabase.from("user_roles").select("roles(code)").eq("user_profile_id", profile.id),
        supabase
          .from("company_workspaces")
          .select(
            `
            id,
            company_identity_id,
            display_name,
            company_identities!inner(
              id,
              official_name,
              sector,
              hazard_class,
              city,
              is_active,
              is_archived,
              deleted_at
            )
          `,
          )
          .eq("organization_id", profile.organization_id)
          .eq("is_archived", false)
          .eq("company_identities.is_active", true)
          .eq("company_identities.is_archived", false)
          .is("company_identities.deleted_at", null)
          .order("display_name", { ascending: true }),
        fetchLibraryContents(),
        fetchDocuments(profile.organization_id),
      ]);

      const roleCodes = (rolesResponse.data ?? []).flatMap((row) => {
        const rolesValue = (row as { roles?: { code?: string } | Array<{ code?: string }> }).roles;
        if (Array.isArray(rolesValue)) {
          return rolesValue.map((role) => role.code ?? "").filter(Boolean);
        }
        return rolesValue?.code ? [rolesValue.code] : [];
      });

      const accessible = ((companyRows.data ?? []) as Array<{
        id: string;
        display_name: string | null;
        company_identity_id: string | null;
        company_identities:
          | { id: string; official_name: string | null; sector: string | null; hazard_class: string | null; city: string | null }
          | Array<{ id: string; official_name: string | null; sector: string | null; hazard_class: string | null; city: string | null }>;
      }>).flatMap((row) => {
        const identity = Array.isArray(row.company_identities) ? row.company_identities[0] : row.company_identities;
        if (!identity) return [];
        const display = row.display_name?.trim();
        const isPlaceholder = display ? /^yeni firma\s*\/\s*kurum$/i.test(display) : false;
        const name =
          !isPlaceholder && display
            ? display
            : identity.official_name ||
              display ||
              pickT(t, "company.anonymousCompany", isTr ? "İsimsiz Firma" : "Unnamed company");
        return [{
          id: row.id,
          legacyCompanyId: row.company_identity_id ?? undefined,
          name,
          sector: identity.sector || "",
          hazardClass: identity.hazard_class || "",
          city: identity.city || "",
        }];
      });

      const fallback = await fetchCompaniesFromSupabase();
      const normalizedCompanies =
        accessible.length > 0
          ? accessible
          : (fallback ?? []).map((company) => ({
              id: company.id,
              legacyCompanyId: undefined,
              name:
                company.shortName?.trim() ||
                company.name ||
                pickT(t, "company.anonymousCompany", isTr ? "İsimsiz Firma" : "Unnamed company"),
              sector: company.sector || "",
              hazardClass: company.hazardClass || "",
              city: company.city || "",
            }));

      const companyIds = normalizedCompanies.flatMap((item) =>
        item.legacyCompanyId ? [item.id, item.legacyCompanyId] : [item.id],
      );
      const savedRowsRaw = await fetchCompanyLibraryItems(companyIds);
      const savedRows = savedRowsRaw.map((row) => {
        const match = normalizedCompanies.find((company) => company.legacyCompanyId === row.company_id);
        return match ? { ...row, company_id: match.id } : row;
      });

      if (!cancelled) {
        setUserContext({
          authUserId: user.id,
          profileId: profile.id,
          fullName:
            profile.full_name ||
            user.email ||
            pickT(t, "user.defaultDisplayName", isTr ? "RiskNova Kullanıcısı" : "RiskNova user"),
          canManageCatalog: roleCodes.some((code) => MANAGE_ROLE_CODES.has(code)),
        });
        setCompanies(normalizedCompanies);
        setContents(libraryResponse);
        setDocuments(documentsResponse);
        setSavedItems(savedRows);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isTr, t]);

  // ---------- Sync with the global active workspace ----------
  // The global header (ActiveCompanyBar) already exposes the working company.
  // We mirror it here so card actions, uploads and AI drafts target the same
  // workspace, eliminating the duplicate picker the user had to manage.
  useEffect(() => {
    let cancelled = false;

    async function syncActiveWorkspace() {
      const ws = await getActiveWorkspace();
      if (cancelled) return;
      if (ws?.id) {
        setCreationCompanyId(ws.id);
        return;
      }
      // No active workspace yet — fall back to the first accessible company so
      // the page is still usable for users who haven't run the switcher.
      setCreationCompanyId((current) =>
        current && companies.some((company) => company.id === current)
          ? current
          : companies[0]?.id ?? "",
      );
    }

    void syncActiveWorkspace();

    function onWorkspaceChanged() {
      void syncActiveWorkspace();
    }
    window.addEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    };
  }, [companies]);

  // ---------- Saved-content lookups ----------
  const savedContentIds = useMemo(() => new Set(savedItems.map((item) => item.content_id)), [savedItems]);
  const savedCompaniesByContent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of savedItems) {
      const list = map.get(item.content_id) ?? [];
      list.push(item.company_id);
      map.set(item.content_id, list);
    }
    return map;
  }, [savedItems]);

  // ---------- Build unified items list ----------
  const allItems = useMemo<LibraryItem[]>(() => {
    const items: LibraryItem[] = [];

    // Catalog items from `library_contents`
    for (const row of contents) {
      const cat = inferLibraryCategory(row.category);
      items.push({
        id: `catalog-${row.id}`,
        category: cat,
        // Catalog rows aren't anchored to a subcategory yet; the DB schema
        // doesn't carry that field. They surface in the "All subcategories"
        // view and stay hidden when a specific subcategory is selected.
        subcategoryKey: null,
        title: row.title,
        description: row.description ?? "",
        contentType: row.content_type ?? "PDF",
        sectorTags: row.sector ?? [],
        flags: { corporate: true },
        usageCount: 0,
        source: "catalog",
        createdAt: row.created_at,
        primaryAction: row.file_url ? { kind: "open", href: row.file_url } : { kind: "ai", prompt: { tr: row.title, en: row.title } },
        downloadHref: row.file_url ?? null,
        libraryContentId: row.id,
        templateId: null,
        groupKey: null,
      });
    }

    // Editor-saved documents
    for (const doc of documents) {
      const variables = doc.variables_data ?? {};
      const company =
        typeof variables.official_name === "string"
          ? variables.official_name
          : typeof variables.company_name === "string"
            ? variables.company_name
            : "";
      const rawSection = typeof variables.__library_section === "string" ? variables.__library_section : "";
      const cat = inferLibraryCategory(rawSection || "documentation");
      const rawSub = typeof variables.__library_subcategory === "string" ? variables.__library_subcategory : null;
      items.push({
        id: `document-${doc.id}`,
        category: cat,
        // Surface the subcategory the user picked when they originally created
        // the document (we stash it in variables_data on save). Older docs that
        // pre-date subcategories simply don't have this field and stay in the
        // "All subcategories" bucket.
        subcategoryKey: rawSub,
        title: doc.title,
        description: company
          ? isTr
            ? `${company} için kaydedildi`
            : `Saved for ${company}`
          : isTr
            ? "Kaydedilmiş editör dokümanı"
            : "Saved editor document",
        contentType: isTr ? "Doküman" : "Doc",
        sectorTags: [],
        flags: {
          user: doc.created_by === userContext.authUserId,
          corporate: doc.created_by !== userContext.authUserId,
        },
        usageCount: 0,
        source: "document",
        createdAt: doc.updated_at,
        primaryAction: { kind: "open", href: `/documents/${doc.id}?library=1&librarySection=${cat}` },
        downloadHref: null,
        documentId: doc.id,
        ownerId: doc.created_by,
        templateId: doc.template_id,
        groupKey: doc.group_key,
      });
    }

    // Starter / seeded templates
    const hidden = new Set(hiddenStarterIds);
    for (const starter of STARTER_TEMPLATES) {
      if (hidden.has(starter.id)) continue;
      items.push({
        id: starter.id,
        category: starter.category,
        subcategoryKey: starter.subcategoryKey ?? null,
        title: pickLocalized(starter.title, locale),
        description: pickLocalized(starter.description, locale),
        contentType:
          starter.action.kind === "ai"
            ? isTr
              ? "AI Taslak"
              : "AI draft"
            : starter.action.kind === "template"
              ? isTr
                ? "Şablon"
                : "Template"
              : starter.action.kind === "module"
                ? isTr
                  ? "Modül"
                  : "Module"
                : isTr
                  ? "Akış"
                  : "Flow",
        sectorTags: starter.sectorTags ?? [],
        flags: starter.flags ?? {},
        usageCount: 0,
        source: "starter",
        createdAt: "2026-05-01T00:00:00Z",
        primaryAction: starter.action,
        downloadHref: null,
        templateId: starter.action.kind === "template" ? starter.action.templateId : null,
        groupKey:
          starter.action.kind === "template"
            ? starter.action.groupKey ?? null
            : starter.action.kind === "group"
              ? starter.action.groupKey
              : null,
      });
    }

    // Template-usage counts derived from existing documents
    const usage = new Map<string, number>();
    for (const doc of documents) {
      const key = doc.template_id || `${doc.group_key}::${doc.title}`;
      usage.set(key, (usage.get(key) ?? 0) + 1);
    }
    return items.map((item) => {
      if (item.source !== "starter") return item;
      const key = item.templateId || `${item.groupKey ?? ""}::${item.title}`;
      return { ...item, usageCount: usage.get(key) ?? 0 };
    });
  }, [contents, documents, hiddenStarterIds, isTr, locale, userContext.authUserId]);

  // ---------- Sector options ----------
  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    for (const item of allItems) {
      for (const sector of item.sectorTags) {
        if (sector) sectors.add(sector);
      }
    }
    if (sectors.size === 0) {
      for (const fallback of SECTOR_DEFAULTS) sectors.add(isTr ? fallback.tr : fallback.en);
    }
    return Array.from(sectors).sort((a, b) => a.localeCompare(b, locale));
  }, [allItems, isTr, locale]);

  // ---------- Counts per category ----------
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allItems) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [allItems]);

  // ---------- Filtered list ----------
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(dateLocaleTag);
    const result = allItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      // Subcategory filter only applies inside a real (non-"all") main
      // category. Items that aren't anchored to a subcategory (legacy catalog
      // rows, untagged user docs) are hidden when a specific subcategory is
      // selected — they only appear in the "All subcategories" view.
      if (
        category !== "all" &&
        subcategory !== ALL_SUBCATEGORIES_KEY &&
        item.subcategoryKey !== subcategory
      ) {
        return false;
      }
      if (savedOnly && !(item.libraryContentId && savedContentIds.has(item.libraryContentId))) return false;
      if (sectorFilter !== "all" && !item.sectorTags.includes(sectorFilter)) return false;
      if (!normalizedQuery) return true;
      const haystack = [item.title, item.description, ...item.sectorTags, item.contentType]
        .join(" ")
        .toLocaleLowerCase(dateLocaleTag);
      return haystack.includes(normalizedQuery);
    });
    return result.sort((left, right) => {
      switch (sortBy) {
        case "oldest":
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        case "az":
          return left.title.localeCompare(right.title, locale);
        case "za":
          return right.title.localeCompare(left.title, locale);
        case "newest":
        default:
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    });
  }, [allItems, category, dateLocaleTag, locale, query, savedContentIds, savedOnly, sectorFilter, sortBy, subcategory]);

  // ---------- Counts per subcategory of the active category ----------
  const subcategoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (category === "all") return map;
    for (const item of allItems) {
      if (item.category !== category) continue;
      if (!item.subcategoryKey) continue;
      map.set(item.subcategoryKey, (map.get(item.subcategoryKey) ?? 0) + 1);
    }
    return map;
  }, [allItems, category]);

  // Total card count for the "All subcategories" pill — equals every item in
  // the active category regardless of subcategory tag.
  const activeCategoryItemCount = useMemo(() => {
    if (category === "all") return allItems.length;
    return allItems.filter((item) => item.category === category).length;
  }, [allItems, category]);

  const activeCategoryDef =
    categoryDefinitions.find((entry) => entry.key === category) ?? null;
  const activeTone = activeCategoryDef ? CATEGORY_TONE_CLASSES[activeCategoryDef.tone] : null;
  const selectedCompany = companies.find((company) => company.id === creationCompanyId) ?? null;

  // ---------- Action handlers ----------
  const handleAction = useCallback(
    (item: LibraryItem) => {
      const action = item.primaryAction;
      if (action.kind === "open") {
        if (action.href.startsWith("http")) {
          window.open(action.href, "_blank", "noreferrer");
          return;
        }
        router.push(action.href);
        return;
      }
      if (action.kind === "module") {
        router.push(action.href);
        return;
      }
      if (action.kind === "template" || action.kind === "group") {
        if (!creationCompanyId) {
          setErrorMessage(
            pickT(
              t,
              "errorsInline.companyRequiredImport",
              isTr ? "Lütfen önce içerik oluşturulacak firmayı seçin." : "Select the working company first.",
            ),
          );
          return;
        }
        const groupKey = action.kind === "template" ? action.groupKey : action.groupKey;
        const params = new URLSearchParams();
        if (groupKey) params.set("group", groupKey);
        if (action.kind === "template") params.set("templateId", action.templateId);
        params.set("companyId", creationCompanyId);
        params.set("mode", "new");
        params.set("library", "1");
        params.set("librarySection", item.category === "all" ? "documentation" : item.category);
        // Carry the subcategory so the editor can persist it on save and the
        // resulting document re-appears under the same subcategory.
        if (item.subcategoryKey) {
          params.set("librarySubcategory", item.subcategoryKey);
        }
        params.set("title", item.title);
        router.push(`/documents/new?${params.toString()}`);
        return;
      }
      if (action.kind === "ai") {
        setAiDraft({
          category: item.category,
          prompt: pickLocalized(action.prompt, locale),
          title: item.title,
        });
      }
    },
    [creationCompanyId, isTr, locale, router, t],
  );

  const submitAiDraft = useCallback(async () => {
    if (!aiDraft) return;
    if (!creationCompanyId) {
      setErrorMessage(
        pickT(
          t,
          "errorsInline.companyRequiredImport",
          isTr ? "Lütfen önce içerik oluşturulacak firmayı seçin." : "Select the working company first.",
        ),
      );
      return;
    }
    setAiDraftSubmitting(true);
    try {
      // Hand off to Nova-aware document editor. The editor reads sessionStorage
      // for the prompt so we don't blow the URL up with a large payload.
      sessionStorage.setItem(
        "risknova:isg-library:aiDraft",
        JSON.stringify({
          prompt: aiDraft.prompt,
          category: aiDraft.category,
          subcategory: subcategory !== ALL_SUBCATEGORIES_KEY ? subcategory : null,
        }),
      );
      const params = new URLSearchParams();
      params.set("companyId", creationCompanyId);
      params.set("mode", "ai");
      params.set("library", "1");
      params.set("librarySection", aiDraft.category === "all" ? "documentation" : aiDraft.category);
      if (subcategory && subcategory !== ALL_SUBCATEGORIES_KEY) {
        params.set("librarySubcategory", subcategory);
      }
      params.set("title", aiDraft.title);
      params.set("ai", "1");
      router.push(`/documents/new?${params.toString()}`);
    } finally {
      setAiDraftSubmitting(false);
    }
  }, [aiDraft, creationCompanyId, isTr, router, subcategory, t]);

  const handlePreview = useCallback(
    async (item: LibraryItem) => {
      if (!item.templateId) {
        const action = item.primaryAction;
        if (action.kind === "open") {
          window.open(action.href, action.href.startsWith("/") ? "_self" : "_blank", "noreferrer");
        }
        return;
      }
      setPreviewLoading(true);
      setPreviewState({ title: item.title, description: item.description, content: null });
      try {
        const template = await getTemplate(item.templateId, locale);
        setPreviewState({
          title: template?.title ?? item.title,
          description: template?.description ?? item.description,
          content:
            template?.content ??
            ({
              type: "doc",
              content: [
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: item.title }] },
                { type: "paragraph", content: [{ type: "text", text: item.description }] },
              ],
            } as JSONContent),
        });
      } catch {
        setErrorMessage(
          pickT(
            t,
            "errorsInline.previewTemplateFailed",
            isTr ? "Şablon önizlemesi yüklenemedi. Lütfen tekrar deneyin." : "Template preview failed. Please try again.",
          ),
        );
        setPreviewState(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [isTr, locale, t],
  );

  const handleDownload = useCallback(
    async (item: LibraryItem) => {
      if (item.downloadHref) {
        window.open(item.downloadHref, item.downloadHref.startsWith("/") ? "_self" : "_blank", "noreferrer");
        return;
      }
      if (!item.templateId) {
        setErrorMessage(
          pickT(
            t,
            "errorsInline.downloadFailed",
            isTr ? "İndirme başarısız. Lütfen tekrar deneyin." : "Download failed. Please try again.",
          ),
        );
        return;
      }
      try {
        const template = await getTemplate(item.templateId, locale);
        const content =
          template?.content ??
          ({
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: item.title }] },
              { type: "paragraph", content: [{ type: "text", text: item.description }] },
            ],
          } as JSONContent);
        const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(template?.title ?? item.title)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.6; }
      h1,h2,h3 { color: #102033; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
      ul, ol { padding-left: 24px; }
      hr { border: none; border-top: 1px solid #cbd5e1; margin: 20px 0; }
    </style>
  </head>
  <body>
    ${renderJsonNodeToHtml(content)}
  </body>
</html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${librarySlugify(template?.title ?? item.title) || "dokuman"}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch {
        setErrorMessage(
          pickT(
            t,
            "errorsInline.downloadHtmlFailed",
            isTr ? "İndirme dosyası oluşturulamadı." : "Could not build the download file.",
          ),
        );
      }
    },
    [isTr, locale, t],
  );

  const openAssignModal = useCallback(
    (item: LibraryItem) => {
      if (!item.libraryContentId) {
        setErrorMessage(
          pickT(
            t,
            "errorsInline.editNeedsTemplate",
            isTr
              ? "Bu içerik henüz katalog kaydı oluşturulmadan firmaya bağlanamaz."
              : "This item must be saved to the catalog before being assigned.",
          ),
        );
        return;
      }
      const already = new Set(savedCompaniesByContent.get(item.libraryContentId) ?? []);
      const available = companies.find((company) => !already.has(company.id))?.id ?? companies[0]?.id ?? "";
      setAssignContent({
        id: item.libraryContentId,
        title: item.title,
        description: item.description,
        category: item.category,
        subcategory: "",
        content_type: item.contentType,
        file_url: item.downloadHref ?? null,
        tags: [],
        sector: item.sectorTags,
        created_at: item.createdAt,
      });
      setAssignCompanyId(available);
      setAssignMessage(null);
      setAssignModalOpen(true);
    },
    [companies, isTr, savedCompaniesByContent, t],
  );

  const handleAssignSubmit = useCallback(async () => {
    if (!assignContent || !assignCompanyId) {
      setAssignMessage(
        pickT(t, "errorsInline.assignSelectCompany", isTr ? "Önce bir firma seçin." : "Select a company first."),
      );
      return;
    }
    setAssigning(true);
    setAssignMessage(null);
    const saved = await assignLibraryContentToCompany({
      companyId: assignCompanyId,
      contentId: assignContent.id,
      addedBy: userContext.profileId,
    });
    if (!saved) {
      setAssigning(false);
      setAssignMessage(
        pickT(t, "errorsInline.assignRecordFailed", isTr ? "Kayıt oluşturulamadı." : "Could not create the record."),
      );
      return;
    }
    setSavedItems((current) => {
      const without = current.filter(
        (item) => !(item.company_id === saved.company_id && item.content_id === saved.content_id),
      );
      return [saved, ...without];
    });
    setStatusMessage(
      isTr ? `${assignContent.title} seçilen firmaya kaydedildi.` : `${assignContent.title} saved to the selected company.`,
    );
    setAssigning(false);
    setAssignModalOpen(false);
  }, [assignCompanyId, assignContent, isTr, t, userContext.profileId]);

  const handleDelete = useCallback(
    async (item: LibraryItem, mode: DeleteMode) => {
      if (mode === "starter-hide") {
        if (!window.confirm(isTr ? `"${item.title}" başlangıç şablonu listeden gizlensin mi?` : `Hide starter "${item.title}" from the list?`)) return;
        setHiddenStarterIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
        setStatusMessage(
          isTr ? `${item.title} listeden gizlendi.` : `${item.title} hidden from the list.`,
        );
        return;
      }
      if (mode === "company") {
        if (!creationCompanyId || !item.libraryContentId) return;
        if (!window.confirm(isTr ? `"${item.title}" seçili firma kütüphanesinden kaldırılsın mı?` : `Remove "${item.title}" from the selected company library?`)) return;
        setDeletingItemId(item.id);
        const ok = await removeLibraryContentFromCompany({
          companyId: creationCompanyId,
          contentId: item.libraryContentId,
        });
        setDeletingItemId(null);
        if (!ok) {
          setErrorMessage(isTr ? "İçerik firmadan kaldırılamadı." : "Could not remove from the company.");
          return;
        }
        setSavedItems((current) =>
          current.filter(
            (saved) => !(saved.company_id === creationCompanyId && saved.content_id === item.libraryContentId),
          ),
        );
        setStatusMessage(isTr ? `${item.title} firmadan kaldırıldı.` : `${item.title} removed from the company.`);
        return;
      }
      if (mode === "document" && item.documentId) {
        if (!window.confirm(isTr ? `"${item.title}" kalıcı olarak silinsin mi?` : `Delete "${item.title}" permanently?`)) return;
        setDeletingItemId(item.id);
        const ok = await deleteDocument(item.documentId);
        setDeletingItemId(null);
        if (!ok) {
          setErrorMessage(isTr ? "İçerik silinemedi." : "Could not delete the item.");
          return;
        }
        setDocuments((current) => current.filter((doc) => doc.id !== item.documentId));
        setStatusMessage(isTr ? `${item.title} silindi.` : `${item.title} deleted.`);
      }
    },
    [creationCompanyId, isTr],
  );

  // ---------- Custom category creation ----------
  const handleCreateCustomCategory = useCallback(() => {
    const trimmed = newCategoryLabel.trim();
    if (!trimmed) {
      setErrorMessage(isTr ? "Kategori adı boş bırakılamaz." : "Category name cannot be empty.");
      return;
    }
    const id = librarySlugify(trimmed) || `c${Date.now().toString(36)}`;
    if (categoryDefinitions.some((entry) => entry.key === `custom:${id}` || librarySlugify(pickLocalized(entry.label, locale)) === id)) {
      setErrorMessage(isTr ? "Bu kategori zaten mevcut." : "This category already exists.");
      return;
    }
    const record: CustomCategoryRecord = {
      id,
      label: trimmed,
      description: newCategoryDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setCustomCategories((current) => [...current, record]);
    setCategory(`custom:${id}`);
    setStatusMessage(isTr ? `"${trimmed}" kategorisi oluşturuldu.` : `Created category "${trimmed}".`);
    setCreateCategoryOpen(false);
    setNewCategoryLabel("");
    setNewCategoryDescription("");
  }, [categoryDefinitions, isTr, locale, newCategoryDescription, newCategoryLabel]);

  const handleRemoveCustomCategory = useCallback(
    (key: CategoryKey) => {
      if (!key.startsWith("custom:")) return;
      const id = key.slice("custom:".length);
      const target = customCategories.find((entry) => entry.id === id);
      if (!target) return;
      if (
        !window.confirm(
          isTr ? `"${target.label}" kategorisi silinsin mi? İçindeki içerikler diğer kategorilere taşınmaz.` : `Delete category "${target.label}"?`,
        )
      ) {
        return;
      }
      setCustomCategories((current) => current.filter((entry) => entry.id !== id));
      setCategory("all");
    },
    [customCategories, isTr],
  );

  // ---------- File upload (used by inline "Cihazdan yükle" CTA) ----------
  const handleFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!selectedCompany) {
        setErrorMessage(isTr ? "Lütfen önce içerik oluşturulacak firmayı seçin." : "Select the working company first.");
        return;
      }
      setImportingDocument(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentTitle", file.name.replace(/\.[^.]+$/, "") || (isTr ? "Yeni Doküman" : "New document"));
        formData.append("companyName", selectedCompany.name);
        formData.append("sector", selectedCompany.sector);
        formData.append("hazardClass", selectedCompany.hazardClass);
        const res = await fetch("/api/document-import", { method: "POST", body: formData });
        if (!res.ok) {
          setErrorMessage(isTr ? "Dosya yüklenirken bir hata oluştu." : "Upload failed.");
          return;
        }
        const data = await res.json();
        sessionStorage.setItem("importedContent", data.content);
        const params = new URLSearchParams();
        params.set("companyId", selectedCompany.id);
        params.set("title", file.name.replace(/\.[^.]+$/, ""));
        params.set("mode", "import");
        params.set("library", "1");
        params.set("librarySection", category === "all" ? "documentation" : category);
        if (subcategory && subcategory !== ALL_SUBCATEGORIES_KEY) {
          params.set("librarySubcategory", subcategory);
        }
        router.push(`/documents/new?${params.toString()}`);
      } catch {
        setErrorMessage(isTr ? "Dosya yüklenemedi. Bağlantınızı kontrol edin." : "Upload failed. Check your connection.");
      } finally {
        setImportingDocument(false);
      }
    },
    [category, isTr, router, selectedCompany, subcategory],
  );

  if (loading) {
    return <LibraryGridSkeleton />;
  }

  // ---------- Render helpers ----------
  function renderFlagBadges(flags: ItemFlags) {
    const list: { label: string; tone: string; icon: LucideIcon }[] = [];
    if (flags.ai) {
      list.push({
        label: isTr ? "AI" : "AI",
        tone: "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-400/25 dark:bg-fuchsia-400/15 dark:text-fuchsia-100",
        icon: Sparkles,
      });
    }
    if (flags.corporate) {
      list.push({
        label: isTr ? "Kurumsal" : "Corporate",
        tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/15 dark:text-amber-100",
        icon: Briefcase,
      });
    }
    if (flags.user) {
      list.push({
        label: isTr ? "Sizin" : "Yours",
        tone: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/15 dark:text-sky-100",
        icon: Users,
      });
    }
    if (flags.operation) {
      list.push({
        label: isTr ? "Operasyon" : "Operation",
        tone: "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/15 dark:text-teal-100",
        icon: Workflow,
      });
    }
    if (flags.risk) {
      list.push({
        label: isTr ? "Risk" : "Risk",
        tone: "border-red-200 bg-red-50 text-red-800 dark:border-red-400/25 dark:bg-red-400/15 dark:text-red-100",
        icon: ShieldAlert,
      });
    }
    if (flags.audit) {
      list.push({
        label: isTr ? "Denetim" : "Audit",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-100",
        icon: ClipboardCheck,
      });
    }
    if (flags.process) {
      list.push({
        label: isTr ? "Paket" : "Pack",
        tone: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/15 dark:text-violet-100",
        icon: Boxes,
      });
    }
    if (!list.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {list.map((badge) => {
          const Icon = badge.icon;
          return (
            <span
              key={badge.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                badge.tone,
              )}
            >
              <Icon size={11} />
              {badge.label}
            </span>
          );
        })}
      </div>
    );
  }

  function renderItemCard(item: LibraryItem) {
    const def = categoryDefinitions.find((entry) => entry.key === item.category);
    const tone = def ? CATEGORY_TONE_CLASSES[def.tone] : CATEGORY_TONE_CLASSES.slate;
    const assignedCompanyIds = item.libraryContentId
      ? (savedCompaniesByContent.get(item.libraryContentId) ?? [])
      : [];
    const isFullyAssigned = companies.length > 0 && companies.every((company) => assignedCompanyIds.includes(company.id));
    const canAssign = Boolean(item.libraryContentId);
    const deleteMode: DeleteMode | null =
      item.source === "starter"
        ? "starter-hide"
        : item.source === "document" && (item.ownerId === userContext.authUserId || userContext.canManageCatalog)
          ? "document"
          : item.libraryContentId && creationCompanyId && assignedCompanyIds.includes(creationCompanyId)
            ? "company"
            : null;
    const isDeleting = deletingItemId === item.id;
    const primaryLabel =
      item.primaryAction.kind === "ai"
        ? isTr
          ? "AI ile Taslak Üret"
          : "Generate with AI"
        : item.primaryAction.kind === "module"
          ? isTr
            ? "Modüle Git"
            : "Open module"
          : item.primaryAction.kind === "open"
            ? isTr
              ? "Aç"
              : "Open"
            : isTr
              ? "Şablonu Kullan"
              : "Use template";
    const primaryIcon =
      item.primaryAction.kind === "ai"
        ? Sparkles
        : item.primaryAction.kind === "module"
          ? ArrowUpRight
          : item.primaryAction.kind === "open"
            ? Eye
            : FilePenLine;
    const PrimaryIcon = primaryIcon;

    return (
      <Card
        key={item.id}
        className={cn(
          "group relative overflow-hidden border bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.10)]",
          tone.panelBorder,
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", tone.accent)} />
        <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/55 blur-2xl transition-opacity group-hover:opacity-80 dark:bg-white/5" />

        {deleteMode ? (
          <button
            type="button"
            onClick={() => void handleDelete(item, deleteMode)}
            disabled={isDeleting}
            title={
              deleteMode === "company"
                ? isTr
                  ? "Firmadan kaldır"
                  : "Remove from company"
                : deleteMode === "starter-hide"
                  ? isTr
                    ? "Listeden gizle"
                    : "Hide from list"
                  : isTr
                    ? "Sil"
                    : "Delete"
            }
            aria-label={isTr ? "Sil" : "Delete"}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 opacity-95 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
          >
            <Trash2 size={15} />
          </button>
        ) : null}

        <CardHeader className="relative space-y-3 pr-12">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                tone.badgeBg,
              )}
            >
              {def ? pickLocalized(def.label, locale) : pickT(t, "categories.all", isTr ? "Tümü" : "All")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {item.contentType}
            </span>
            {item.usageCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {isTr ? `${item.usageCount} kullanım` : `${item.usageCount} uses`}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
            <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-6 text-muted-foreground">
              {item.description || (isTr ? "Bu içerik için kısa açıklama henüz eklenmedi." : "No short description yet.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderFlagBadges(item.flags)}
            {item.sectorTags.slice(0, 2).map((sector) => (
              <Badge key={sector} variant="accent">
                {sector}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAction(item)}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                "bg-[var(--primary)] text-white hover:brightness-110",
              )}
            >
              <PrimaryIcon size={15} />
              {primaryLabel}
            </button>

            {item.templateId ? (
              <button
                type="button"
                onClick={() => void handlePreview(item)}
                title={isTr ? "Önizle" : "Preview"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:border-[var(--gold)]/30 hover:text-foreground"
              >
                <Eye size={15} />
              </button>
            ) : null}

            {item.templateId || item.downloadHref ? (
              <button
                type="button"
                onClick={() => void handleDownload(item)}
                title={isTr ? "İndir" : "Download"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:border-[var(--gold)]/30 hover:text-foreground"
              >
                <Download size={15} />
              </button>
            ) : null}
          </div>

          {canAssign ? (
            <button
              type="button"
              onClick={() => openAssignModal(item)}
              disabled={companies.length === 0 || isFullyAssigned}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition",
                companies.length === 0 || isFullyAssigned
                  ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground"
                  : "border-[var(--gold)]/35 bg-[var(--gold)]/10 text-[var(--primary)] hover:bg-[var(--gold)]/15 dark:text-[#f3c978]",
              )}
            >
              {isFullyAssigned ? <Check size={15} /> : <Building2 size={15} />}
              {isFullyAssigned
                ? isTr
                  ? "Tüm firmalara kaydedildi"
                  : "Saved to all companies"
                : isTr
                  ? "Firmaya Ata"
                  : "Assign to company"}
            </button>
          ) : null}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {item.source === "starter"
                ? isTr
                  ? "Başlangıç şablonu"
                  : "Starter template"
                : item.source === "document"
                  ? isTr
                    ? "Editör dokümanı"
                    : "Editor document"
                  : isTr
                    ? "Katalog"
                    : "Catalog"}
            </span>
            <span>
              {new Date(item.createdAt).toLocaleDateString(dateLocaleTag, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderAddCard() {
    return (
      <button
        type="button"
        onClick={() => {
          if (!creationCompanyId) {
            setErrorMessage(isTr ? "Lütfen önce içerik oluşturulacak firmayı seçin." : "Select the working company first.");
            return;
          }
          setAiDraft({
            category: category === "all" ? "documentation" : category,
            prompt: isTr
              ? "Aşağıdaki bağlam için bir İSG içeriği taslağı oluştur."
              : "Draft an OHS content piece for the context below.",
            title: isTr ? "Yeni Taslak" : "New draft",
          });
        }}
        className={cn(
          "group flex min-h-[260px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed p-6 text-center transition",
          "border-[var(--gold)]/40 bg-gradient-to-br from-white via-amber-50/55 to-yellow-50/60 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_22px_55px_rgba(184,134,11,0.18)] dark:border-[#6f5320] dark:from-slate-950 dark:via-amber-950/15 dark:to-slate-950",
        )}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-[var(--gold)]/45 bg-[var(--gold)]/15 text-[var(--gold)] transition group-hover:scale-105">
          <Sparkles size={28} strokeWidth={2.4} />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {isTr ? "AI ile Yeni Taslak" : "New AI Draft"}
        </h3>
        <p className="mt-1.5 max-w-[18rem] text-sm leading-6 text-muted-foreground">
          {isTr
            ? "Sektör, departman veya operasyonu yazın; Nova size özel taslak çıkarır."
            : "Describe the sector, department or operation; Nova drafts it for you."}
        </p>
      </button>
    );
  }

  // ---------- Layout ----------
  const visibleCategoryDefs = categoryDefinitions;

  const headerEyebrow = pickT(t, "header.eyebrow", isTr ? "İSG Kütüphanesi" : "ISG Library");
  const headerTitle = isTr ? "İSG Kütüphanesi" : "ISG Library";
  const headerDescription = isTr
    ? "Kurumsal hafıza, operasyon şablonları ve AI destekli başlangıç içerikleri tek bir merkezde. Doküman, talimat, denetim akışı ve süreç paketlerinizi buradan başlatın."
    : "Institutional memory, operation templates and AI-assisted starter content in one place. Kick off documents, instructions, audit flows and process packs from here.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        description={headerDescription}
        className="relative overflow-visible border-border bg-card dark:text-slate-100"
        meta={
          <>
            <span className="inline-flex items-center rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] dark:text-[#f3c978]">
              {userContext.fullName}
            </span>
            {selectedCompany ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/25 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Building2 size={12} className="shrink-0 text-[var(--gold)]/90" />
                <span className="truncate max-w-[18rem]" title={selectedCompany.name}>
                  {selectedCompany.name}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {isTr ? `${allItems.length} içerik` : `${allItems.length} items`}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {isTr ? `${customCategories.length} özel kategori` : `${customCategories.length} custom categories`}
            </span>
          </>
        }
        actions={
          <>
            {/*
              The active company is already controlled by the global header bar
              (ActiveCompanyBar / WorkspaceSwitcher) at the top of every page.
              We removed the duplicate picker here so users have a single source
              of truth for "which company am I working on?".
            */}
            <button
              type="button"
              onClick={() => setSavedOnly((current) => !current)}
              className={cn(
                "inline-flex h-11 items-center rounded-2xl border px-4 text-sm font-semibold transition",
                savedOnly
                  ? "border-[var(--gold)]/35 bg-[var(--gold)]/15 text-[var(--primary)]"
                  : "border-border bg-background/85 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white",
              )}
            >
              {isTr ? "Firmama kaydedilenler" : "Saved to my companies"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/companies")}
              className="inline-flex h-11 items-center rounded-2xl border border-border bg-background/85 px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            >
              {isTr ? "Firmaları yönet" : "Manage companies"}
            </button>
          </>
        }
      />

      {/* ---- Category strip ---- */}
      <section className="relative rounded-[1.75rem] border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* "All" chip */}
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-[1rem] border px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200",
              category === "all" ? CATEGORY_TONE_CLASSES.slate.chipActive : CATEGORY_TONE_CLASSES.slate.chipIdle,
            )}
          >
            <LayoutGrid size={15} />
            <span className="whitespace-nowrap">{pickLocalized(ALL_CATEGORY_LABEL, locale)}</span>
            <span className="ml-1 rounded-full border border-current/30 bg-white/35 px-1.5 py-0 text-[10px] font-bold text-current/85 dark:bg-white/10">
              {allItems.length}
            </span>
          </button>

          {visibleCategoryDefs.map((definition) => {
            const Icon = CATEGORY_ICONS[definition.iconKey];
            const tone = CATEGORY_TONE_CLASSES[definition.tone];
            const isActive = definition.key === category;
            const count = categoryCounts.get(definition.key) ?? 0;
            return (
              <button
                key={definition.key}
                type="button"
                onClick={() => setCategory(definition.key)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[1rem] border px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200",
                  isActive ? tone.chipActive : tone.chipIdle,
                )}
              >
                <Icon size={15} />
                <span className="whitespace-nowrap">{pickLocalized(definition.label, locale)}</span>
                <span className="ml-1 rounded-full border border-current/30 bg-white/35 px-1.5 py-0 text-[10px] font-bold text-current/85 dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}

          {/* Add-category chip */}
          <button
            type="button"
            onClick={() => {
              setNewCategoryLabel("");
              setNewCategoryDescription("");
              setCreateCategoryOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-[1rem] border border-dashed border-[var(--gold)]/45 bg-[var(--gold)]/8 px-3.5 py-2.5 text-[13px] font-semibold text-[var(--primary)] transition hover:bg-[var(--gold)]/15 dark:text-[#f3c978]"
          >
            <Plus size={15} />
            {isTr ? "Kategori Ekle" : "Add category"}
          </button>
        </div>
      </section>

      {/* ---- Filter bar ---- */}
      <section className="relative grid gap-3 rounded-[1.5rem] border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] sm:p-4 xl:grid-cols-[minmax(0,1.6fr)_180px_180px]">
        <label className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isTr ? "Başlık, açıklama veya etiket ara…" : "Search title, description, tags…"}
            className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
          />
        </label>

        <label className="relative">
          <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sectorFilter}
            onChange={(event) => setSectorFilter(event.target.value)}
            className="h-12 w-full appearance-none rounded-2xl border border-border bg-background pl-11 pr-9 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
          >
            <option value="all">{isTr ? "Tüm sektörler" : "All sectors"}</option>
            {sectorOptions.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(getSortKey(event.target.value))}
            className="h-12 w-full appearance-none rounded-2xl border border-border bg-background pl-11 pr-9 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
          >
            <option value="newest">{isTr ? "En yeni" : "Newest"}</option>
            <option value="oldest">{isTr ? "En eski" : "Oldest"}</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </label>
      </section>

      {/* ---- Active category header ---- */}
      {activeCategoryDef ? (
        <section
          className={cn(
            "relative flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border bg-card/95 p-4 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
            activeTone?.panelBorder,
          )}
        >
          <div className="flex items-start gap-4">
            <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-current/30 bg-current/10")}> 
              {(() => {
                const Icon = CATEGORY_ICONS[activeCategoryDef.iconKey];
                return <Icon size={20} />;
              })()}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">{pickLocalized(activeCategoryDef.label, locale)}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{pickLocalized(activeCategoryDef.description, locale)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {category.startsWith("custom:") ? (
              <button
                type="button"
                onClick={() => handleRemoveCustomCategory(category)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200"
              >
                <Trash2 size={14} />
                {isTr ? "Kategoriyi Sil" : "Delete category"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!creationCompanyId || importingDocument}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--gold)]/30 bg-background px-3 text-xs font-semibold text-foreground transition",
                creationCompanyId && !importingDocument ? "hover:bg-[var(--gold)]/10" : "cursor-not-allowed opacity-60",
              )}
            >
              <Upload size={14} />
              {importingDocument ? (isTr ? "Yükleniyor…" : "Uploading…") : isTr ? "Dosya yükle" : "Upload file"}
            </button>
          </div>
        </section>
      ) : null}

      {/* ---- Status / error banners ---- */}
      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-100">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} aria-label="dismiss">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* ---- Subcategory rail + content grid ---- */}
      {activeCategoryDef && activeSubcategories.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Subcategory list — sticky on desktop, horizontal scroll chip strip on mobile */}
          <aside
            className={cn(
              "rounded-[1.5rem] border bg-card/95 p-3 shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] lg:sticky lg:top-4 lg:self-start lg:p-4",
              activeTone?.panelBorder,
            )}
          >
            <div className="mb-2 hidden items-center gap-2 px-1 lg:flex">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {isTr ? "Alt başlıklar" : "Subcategories"}
              </span>
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground/80">
                {activeSubcategories.length}
              </span>
            </div>

            {/* Mobile: horizontal scroll chip strip; Desktop: vertical button list */}
            <div className="no-scrollbar -mx-1 flex flex-row items-stretch gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
              <button
                type="button"
                onClick={() => setSubcategory(ALL_SUBCATEGORIES_KEY)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition lg:w-full",
                  subcategory === ALL_SUBCATEGORIES_KEY
                    ? activeTone?.chipActive
                    : activeTone?.chipIdle,
                )}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid size={14} />
                  <span className="whitespace-nowrap">{pickLocalized(ALL_SUBCATEGORIES_LABEL, locale)}</span>
                </span>
                <span className="rounded-full border border-current/30 bg-white/35 px-1.5 py-0 text-[10px] font-bold text-current/85 dark:bg-white/10">
                  {activeCategoryItemCount}
                </span>
              </button>

              {activeSubcategories.map((sub) => {
                const isActive = sub.key === subcategory;
                const count = subcategoryCounts.get(sub.key) ?? 0;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => setSubcategory(sub.key)}
                    title={sub.description ? pickLocalized(sub.description, locale) : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition lg:w-full",
                      isActive ? activeTone?.chipActive : activeTone?.chipIdle,
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{pickLocalized(sub.label, locale)}</span>
                    <span className="rounded-full border border-current/30 bg-white/35 px-1.5 py-0 text-[10px] font-bold text-current/85 dark:bg-white/10">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active subcategory description (desktop only) */}
            {subcategory !== ALL_SUBCATEGORIES_KEY ? (
              <p className="mt-3 hidden text-[11px] leading-5 text-muted-foreground lg:block">
                {(() => {
                  const sub = activeSubcategories.find((s) => s.key === subcategory);
                  return sub?.description ? pickLocalized(sub.description, locale) : "";
                })()}
              </p>
            ) : null}
          </aside>

          {/* Card grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {renderAddCard()}
            {filteredItems.map((item) => renderItemCard(item))}
            {filteredItems.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card/80 px-6 py-12 text-center shadow-[var(--shadow-card)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)]">
                    <LayoutGrid size={22} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {isTr ? "Bu görünümde içerik yok" : "Nothing here yet"}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {isTr
                      ? "Alt başlığı değiştirmeyi, filtreyi temizlemeyi veya AI ile yeni bir taslak oluşturmayı deneyin."
                      : "Try a different subcategory, clear filters, or generate a draft with AI."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        // No subcategories on this category — fall back to a single-column grid
        // (e.g. "all", "user-templates", or custom user-created categories).
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {renderAddCard()}
          {filteredItems.map((item) => renderItemCard(item))}
          {filteredItems.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 2xl:col-span-4">
              <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card/80 px-6 py-12 text-center shadow-[var(--shadow-card)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)]">
                  <LayoutGrid size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {isTr ? "Bu görünümde içerik yok" : "Nothing here yet"}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {isTr
                    ? "Kategori değiştirmeyi, filtreyi temizlemeyi veya AI ile yeni bir taslak oluşturmayı deneyin."
                    : "Try a different category, clear filters, or generate a draft with AI."}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => void handleFileSelected(event)}
      />

      {/* ---- Assign-to-company modal ---- */}
      {assignModalOpen && assignContent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isTr ? "Firmaya Ata" : "Assign to company"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isTr
                    ? `"${assignContent.title}" içeriğini seçtiğiniz firmaya kaydedin.`
                    : `Save "${assignContent.title}" to the selected company.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-foreground">
                  {isTr ? "Firma" : "Company"}
                </span>
                <select
                  value={assignCompanyId}
                  onChange={(event) => setAssignCompanyId(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
                >
                  <option value="">{isTr ? "Firma seçin" : "Select company"}</option>
                  {companies.map((company) => {
                    const already = (savedCompaniesByContent.get(assignContent.id) ?? []).includes(company.id);
                    return (
                      <option key={company.id} value={company.id} disabled={already}>
                        {company.name}
                        {already ? (isTr ? " (zaten kayıtlı)" : " (already saved)") : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              {assignMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {assignMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:border-[var(--gold)]/35"
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAssignSubmit()}
                  disabled={assigning || !assignCompanyId}
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition",
                    assigning || !assignCompanyId
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-[var(--primary)] hover:brightness-110",
                  )}
                >
                  {assigning ? (isTr ? "Kaydediliyor…" : "Saving…") : isTr ? "Firmaya Kaydet" : "Save to company"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- AI prompt modal ---- */}
      {aiDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-700 dark:border-fuchsia-400/25 dark:bg-fuchsia-400/10 dark:text-fuchsia-100">
                  <Sparkles size={12} /> {isTr ? "AI Taslak" : "AI draft"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {isTr ? "Nova ile Taslak Üret" : "Draft with Nova"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isTr
                    ? "İhtiyacınızı netleştirin. Editörde Nova bu girdiyi kullanarak ilk taslağınızı, mevzuat bağlantılarını ve risk önerilerini üretir."
                    : "Refine the brief. Nova will use it in the editor to draft content, legal links and risk suggestions."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAiDraft(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-foreground">{isTr ? "Başlık" : "Title"}</span>
                <input
                  value={aiDraft.title}
                  onChange={(event) => setAiDraft({ ...aiDraft, title: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-foreground">{isTr ? "Brief / İstek" : "Brief / request"}</span>
                <textarea
                  rows={6}
                  value={aiDraft.prompt}
                  onChange={(event) => setAiDraft({ ...aiDraft, prompt: event.target.value })}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
                />
              </label>

              <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 p-3 text-xs leading-5 text-fuchsia-900 dark:border-fuchsia-400/25 dark:bg-fuchsia-400/8 dark:text-fuchsia-100">
                <strong>{isTr ? "İpucu:" : "Tip:"} </strong>
                {isTr
                  ? "Sektörü, departmanı ve birkaç tehlikeyi yazarsanız Nova daha hedefli bir taslak çıkarır."
                  : "Naming the sector, department and a few hazards lets Nova produce a sharper draft."}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAiDraft(null)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:border-[var(--gold)]/35"
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => void submitAiDraft()}
                  disabled={aiDraftSubmitting || !aiDraft.prompt.trim()}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition",
                    aiDraftSubmitting || !aiDraft.prompt.trim()
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:brightness-110",
                  )}
                >
                  <Sparkles size={15} />
                  {aiDraftSubmitting ? (isTr ? "Hazırlanıyor…" : "Preparing…") : isTr ? "Editörde Üret" : "Generate in editor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Custom category modal ---- */}
      {createCategoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {isTr ? "Yeni Ana Kategori" : "New main category"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isTr
                    ? "Sektörünüze veya operasyonunuza özel kütüphane oluşturun. Örnek: Hastane Operasyonları, Kimyasal Güvenlik, Yaşlı Bakım Merkezi."
                    : "Create a category that matches your sector or operation. Example: Hospital Ops, Chemical Safety, Elderly Care."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateCategoryOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-foreground">{isTr ? "Kategori Adı" : "Category name"}</span>
                <input
                  value={newCategoryLabel}
                  onChange={(event) => setNewCategoryLabel(event.target.value)}
                  placeholder={isTr ? "Örn. Hastane Operasyonları" : "e.g. Hospital Ops"}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium text-foreground">
                  {isTr ? "Kısa Açıklama (opsiyonel)" : "Short description (optional)"}
                </span>
                <textarea
                  rows={3}
                  value={newCategoryDescription}
                  onChange={(event) => setNewCategoryDescription(event.target.value)}
                  placeholder={
                    isTr
                      ? "Bu kategoride hangi tür şablonları toplayacaksınız?"
                      : "What kind of templates will live here?"
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-[var(--gold)]/40"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateCategoryOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:border-[var(--gold)]/35"
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomCategory}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  <Plus size={15} />
                  {isTr ? "Kategoriyi Oluştur" : "Create category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Template preview modal ---- */}
      {previewState ? (
        <TemplatePreviewModal
          title={previewState.title}
          description={previewState.description}
          content={previewState.content}
          loading={previewLoading}
          isTr={isTr}
          onClose={() => {
            setPreviewLoading(false);
            setPreviewState(null);
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template preview modal
// ---------------------------------------------------------------------------
function TemplatePreviewModal(props: {
  title: string;
  description: string;
  content: JSONContent | null;
  loading: boolean;
  isTr: boolean;
  onClose: () => void;
}) {
  const previewHtml = useMemo(() => (props.content ? renderJsonNodeToHtml(props.content) : ""), [props.content]);
  const hasContent = Boolean(props.content?.content?.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]/90">
              {props.isTr ? "Şablon Önizleme" : "Template preview"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{props.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{props.description}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,251,235,0.9))] px-6 py-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.94))]">
          {props.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3 rounded-xl" />
              <Skeleton className="h-5 w-full rounded-xl" />
              <Skeleton className="h-5 w-5/6 rounded-xl" />
              <Skeleton className="h-80 w-full rounded-[1.5rem]" />
            </div>
          ) : (
            <div className="a4-page mx-auto min-h-0 max-w-4xl rounded-[1.5rem] border border-border bg-white px-8 py-8 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100">
              {hasContent ? (
                <div className="tiptap min-h-[600px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-background/50 px-6 text-center text-sm text-muted-foreground">
                  {props.isTr
                    ? "Önizleme içeriği yüklenemedi. Bu şablonu yine de indirip düzenleyebilirsiniz."
                    : "Preview content failed. You can still download and edit this template."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <Link
            href="/documents/new"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-[var(--gold)]/35"
          >
            {props.isTr ? "Editörde Aç" : "Open in editor"}
          </Link>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {props.isTr ? "Kapat" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
