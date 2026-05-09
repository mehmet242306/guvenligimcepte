# Faz 0 — i18n envanter raporu

Oluşturulma: 2026-05-09T07:55:55.595Z

## Yöntem

- **Kaynak taraması**: `src/**/*.ts(x)` satırlarında çift/tek tırnak stringleri; uzunluk, boşluk, Türkçe karakter ve teknik olmayan token sezgisi ile **şüpheli UI metni** sayısı.
- **Türkçe satır sayısı**: Satırda `ğüşıöçĞÜŞİÖÇİı` geçmesi (import/log satırları tam ayıklanamaz — yanlış pozitif/negatif olabilir).
- **Locale**: `messages/*.json` yaprağı (string leaf) yolları `en.json` ile karşılaştırıldı; aynı değer = İngilizce kopya sayılır.

## Özet — modül kovaları (şüpheli string toplamı)

| Kovası | Dosya sayısı | Şüpheli string | Türkçe karakter içeren satır (toplam) |
|--------|-------------:|---------------:|---------------------------------------:|
| app/(public) | 24 | 538 | 12 |
| app/(protected) | 116 | 7864 | 1068 |
| app/other | 78 | 954 | 159 |
| components | 108 | 3180 | 259 |
| lib | 117 | 3160 | 1330 |
| src/other | 1 | 1 | 0 |

**Şüpheli string içeren dosya sayısı**: 444

## Locale dosyaları (`messages/*.json`)

**en.json string yaprağı sayısı**: 5062

| Locale | Dosya boyutu (bayt) | Yaprak sayısı | en ile karşılaştırılabilir yaprak | Eksik anahtar (en’e göre) | Aynı değer (karşılaştırılabilir içinde) | % aynı (en) | Not |
|--------|--------------------:|--------------:|----------------------------------:|---------------------------:|----------------------------------------:|-------------:|-----|
| ar | 375994 | 5062 | 5062 | 0 | 1035 | 20.4% |  |
| az | 326934 | 5062 | 5062 | 0 | 1102 | 21.8% |  |
| de | 326535 | 5062 | 5062 | 0 | 1127 | 22.3% |  |
| en | 302476 | 5062 | — | — | — | 100 | source locale |
| es | 327195 | 5062 | 5062 | 0 | 1136 | 22.4% |  |
| fr | 334641 | 5062 | 5062 | 0 | 1190 | 23.5% |  |
| hi | 482182 | 5062 | 5062 | 0 | 1066 | 21.1% |  |
| id | 311144 | 5062 | 5062 | 0 | 1167 | 23.1% |  |
| ja | 341575 | 5062 | 5062 | 0 | 1068 | 21.1% |  |
| ko | 318640 | 5062 | 5062 | 0 | 1074 | 21.2% |  |
| ru | 430363 | 5062 | 5062 | 0 | 1059 | 20.9% |  |
| tr | 316152 | 5062 | 5062 | 0 | 192 | 3.8% | primary translated locale (expect low % match to en) |
| zh | 289988 | 5062 | 5062 | 0 | 1045 | 20.6% |  |

### Yorum

- **tr**: İngilizce ile düşük örtüşme beklenir (gerçek Türkçe çeviri).
- **de, ar, …**: Çoğu anahtarda metin `en` ile aynıysa dosya **İngilizce bootstrap kopyası** olarak işaretlenmiştir.

## Dosya bazlı checklist (şüpheli string sayısına göre, ilk 120)

| Şüpheli str. | TR satır* | Dosya |
|-------------:|----------:|-------|
| 588 | 266 | `src/app/(protected)/isg-library/library-config.ts` |
| 461 | 80 | `src/lib/turkey-locations.ts` |
| 423 | 24 | `src/components/companies/WorkspaceTabs.tsx` |
| 402 | 113 | `src/app/(protected)/isg-library/IsgLibraryClient.tsx` |
| 369 | 50 | `src/app/(protected)/risk-analysis/RiskAnalysisClient.tsx` |
| 235 | 1 | `src/app/(protected)/osgb/documents/page.tsx` |
| 217 | 1 | `src/lib/platform-admin/demo-localization.ts` |
| 210 | 0 | `src/app/(protected)/platform-admin/page.tsx` |
| 206 | 0 | `src/app/(protected)/settings/SelfHealingTab.tsx` |
| 204 | 6 | `src/app/(protected)/profile/ProfileClient.tsx` |
| 195 | 3 | `src/components/companies/PersonnelManagementPanel.tsx` |
| 188 | 166 | `src/lib/document-templates-p1.ts` |
| 180 | 2 | `src/components/chat/ChatWidget.tsx` |
| 179 | 19 | `src/app/(protected)/planner/PlannerClient.tsx` |
| 173 | 2 | `src/lib/mailer.ts` |
| 172 | 58 | `src/app/(protected)/training/slides/[id]/edit/SlideEditorClient.tsx` |
| 160 | 13 | `src/components/companies/TeamManagementTab.tsx` |
| 152 | 0 | `src/app/(protected)/timesheet/TimesheetClient.tsx` |
| 151 | 19 | `src/app/(protected)/digital-twin/page.tsx` |
| 149 | 0 | `src/app/(protected)/training/new/TrainingNewClient.tsx` |
| 146 | 15 | `src/app/(protected)/incidents/new/NewIncidentWizard.tsx` |
| 142 | 0 | `src/app/(protected)/settings/KvkkCenterTab.tsx` |
| 134 | 0 | `src/app/(protected)/dashboard/DashboardClient.tsx` |
| 133 | 6 | `src/app/(protected)/settings/AdminAITab.tsx` |
| 131 | 0 | `src/app/(protected)/settings/AIUsageTab.tsx` |
| 131 | 1 | `src/app/(protected)/settings/page.tsx` |
| 131 | 0 | `src/app/(protected)/training/[id]/TrainingDetailClient.tsx` |
| 131 | 101 | `src/lib/chat-knowledge.ts` |
| 128 | 46 | `src/app/(protected)/documents/DocumentsClient.tsx` |
| 121 | 34 | `src/app/(protected)/personnel/[id]/PersonnelProfileClient.tsx` |
| 115 | 4 | `src/app/api/analyze-risk/route.ts` |
| 114 | 109 | `src/app/(protected)/score-history/_data/starter-templates.ts` |
| 110 | 0 | `src/app/(protected)/settings/KvkkTransferAndBreachPanel.tsx` |
| 110 | 44 | `src/components/analysis/MortPanel.tsx` |
| 110 | 54 | `src/lib/planner/periodic-control-templates.ts` |
| 109 | 36 | `src/app/(protected)/training/slides/SlideLibraryClient.tsx` |
| 108 | 4 | `src/app/(protected)/companies/CompaniesListClient.tsx` |
| 107 | 0 | `src/app/api/document-ai/route.ts` |
| 106 | 111 | `src/lib/scat-pdf-template.ts` |
| 100 | 0 | `src/app/(protected)/settings/KvkkDataRightsPanel.tsx` |
| 98 | 2 | `src/app/api/nova/chat/route.ts` |
| 97 | 72 | `src/lib/mort-pdf-template.ts` |
| 97 | 4 | `src/lib/r2d-rca-pdf-template.ts` |
| 91 | 29 | `src/app/(protected)/training/certificates/CertificatesClient.tsx` |
| 91 | 50 | `src/components/companies/CompanySharedOpsPanel.tsx` |
| 87 | 53 | `src/app/(protected)/corrective-actions/[id]/CorrectiveActionDetailClient.tsx` |
| 86 | 0 | `src/app/(protected)/workspace/onboarding/WorkspaceOnboardingClient.tsx` |
| 86 | 4 | `src/components/analysis/BowTiePanel.tsx` |
| 85 | 0 | `src/app/(public)/page.tsx` |
| 81 | 7 | `src/app/(protected)/incidents/[id]/dof/DofClient.tsx` |
| 81 | 2 | `src/components/layout/protected-shell.tsx` |
| 81 | 62 | `src/lib/risk-analysis-export.ts` |
| 80 | 0 | `src/app/(protected)/settings/UserManagementTab.tsx` |
| 80 | 13 | `src/lib/risk-scoring.ts` |
| 73 | 6 | `src/app/(protected)/training/TrainingClient.tsx` |
| 73 | 0 | `src/components/companies/InviteProfessionalModal.tsx` |
| 72 | 0 | `src/app/api/workspaces/onboarding/route.ts` |
| 71 | 1 | `src/app/(protected)/osgb/firms/OsgbFirmsClient.tsx` |
| 71 | 1 | `src/app/(protected)/platform-admin/demo-builder/DemoBuilderClient.tsx` |
| 70 | 6 | `src/app/(protected)/training/slides/[id]/present/PresenterClient.tsx` |
| 68 | 0 | `src/app/(public)/survey/[token]/SurveyFillClient.tsx` |
| 68 | 5 | `src/components/analysis/R2dRcaPanel.tsx` |
| 67 | 0 | `src/app/(public)/pricing/PricingPlansClient.tsx` |
| 66 | 0 | `src/components/companies/OrganizationPanel.tsx` |
| 64 | 1 | `src/app/(protected)/planner/YearlyTrainingTab.tsx` |
| 64 | 44 | `src/lib/company-share-registry.ts` |
| 64 | 48 | `src/lib/nova/site-map.ts` |
| 64 | 0 | `src/lib/r2d-rca-pdf-i18n.ts` |
| 63 | 0 | `src/components/ui/premium-icon-badge.tsx` |
| 59 | 0 | `src/app/(protected)/osgb/tasks/OsgbTasksBoardClient.tsx` |
| 58 | 0 | `src/components/auth/RegisterCommercialPlans.tsx` |
| 57 | 0 | `src/app/(protected)/osgb/contracts/page.tsx` |
| 57 | 0 | `src/app/(protected)/platform-admin/legal-corpus/LegalCorpusAdminClient.tsx` |
| 56 | 0 | `src/app/(protected)/osgb/page.tsx` |
| 56 | 0 | `src/app/(protected)/settings/TenantLegalLibraryPanel.tsx` |
| 55 | 0 | `src/app/(protected)/companies/[id]/CompanyScanData.tsx` |
| 55 | 0 | `src/app/(public)/certificate/verify/[id]/CertificateVerifyClient.tsx` |
| 55 | 0 | `src/components/documents/AIAssistantPanel.tsx` |
| 54 | 10 | `src/app/(protected)/documents/[id]/DocumentEditorClient.tsx` |
| 54 | 1 | `src/app/(protected)/planner/PeriodicControlsRegisterTab.tsx` |
| 54 | 0 | `src/app/(protected)/platform-admin/demo-builder/DemoGroupsClient.tsx` |
| 54 | 1 | `src/components/companies/OhsFileTab.tsx` |
| 53 | 1 | `src/app/(protected)/planner/YearlyWorkPlanTab.tsx` |
| 53 | 0 | `src/app/(protected)/settings/ErrorLogsTab.tsx` |
| 53 | 0 | `src/app/(public)/share/risk/[token]/SharedRiskAnalysisView.tsx` |
| 52 | 1 | `src/app/(protected)/osgb/personnel/OsgbPersonnelInviteCard.tsx` |
| 52 | 1 | `src/app/(protected)/osgb/personnel/page.tsx` |
| 52 | 54 | `src/lib/company-directory.ts` |
| 51 | 11 | `src/app/(protected)/digital-twin/LiveStreamViewer.tsx` |
| 49 | 0 | `src/app/(protected)/profile/ProfileDataRightsPanel.tsx` |
| 49 | 0 | `src/app/(protected)/score-history/_components/tabs/ActiveInspectionTab.tsx` |
| 49 | 0 | `src/app/(protected)/score-history/_lib/constants.ts` |
| 49 | 1 | `src/lib/nova-ui.ts` |
| 48 | 0 | `src/app/(protected)/settings/AdminDocumentsTab.tsx` |
| 48 | 0 | `src/app/(protected)/settings/DatabaseHealthTab.tsx` |
| 47 | 10 | `src/app/(protected)/incidents/[id]/IncidentDetailClient.tsx` |
| 47 | 0 | `src/app/(protected)/settings/SecurityEventsTab.tsx` |
| 45 | 3 | `src/app/(protected)/companies/[id]/CompanyWorkspaceClient.tsx` |
| 45 | 0 | `src/app/(protected)/platform-admin/leads/_components/LeadsTable.tsx` |
| 45 | 8 | `src/app/(protected)/rca/[incidentId]/RcaResultsClient.tsx` |
| 45 | 36 | `src/app/api/ai/analysis/route.ts` |
| 45 | 70 | `src/lib/ai/openai-vision.ts` |
| 45 | 28 | `src/lib/document-variables.ts` |
| 45 | 30 | `src/lib/prompts/r2d-rca-incident-ai-locale.ts` |
| 45 | 14 | `src/lib/supabase/tracking-api.ts` |
| 43 | 11 | `src/app/(protected)/training/slides/[id]/analytics/DeckAnalyticsClient.tsx` |
| 43 | 0 | `src/components/auth/RegisterAccountTypePreview.tsx` |
| 42 | 28 | `src/lib/dof-pdf-template.ts` |
| 41 | 0 | `src/app/(protected)/incidents/[id]/ishikawa/IshikawaClient.tsx` |
| 41 | 19 | `src/app/(protected)/reports/ReportsClient.tsx` |
| 40 | 18 | `src/components/companies/CompanyManagementActions.tsx` |
| 39 | 0 | `src/app/(protected)/incidents/AnalizlerContent.tsx` |
| 39 | 0 | `src/app/(protected)/settings/AuditLogsTab.tsx` |
| 39 | 33 | `src/lib/workplace-status.ts` |
| 38 | 0 | `src/app/(protected)/notifications/page.tsx` |
| 38 | 16 | `src/components/analysis/AnalysisShareModal.tsx` |
| 37 | 0 | `src/app/(protected)/settings/AdminNotificationsTab.tsx` |
| 37 | 0 | `src/components/analysis/RcaIntroPanel.tsx` |
| 37 | 0 | `src/components/layout/language-selector.tsx` |
| 36 | 0 | `src/app/(protected)/incidents/IncidentsListClient.tsx` |

*… ve 324 dosya daha (tam liste için script çıktısını genişletin).*

\* *Türkçe satır*: heuristic; string içinde veya yorumda Türkçe geçebilir.*

## Faz 0 tamamlandı

- [x] Kaynak kod sezgisel taraması
- [x] Kovası özet tablosu
- [x] Locale vs `en.json` yaprağı karşılaştırması

### Tekrar üret

- Anahtar eşliği + rapor: `npm run i18n:phase0` (`frontend/` içinden).
- Yalnızca rapor: `npm run i18n:phase0-inventory`.
- Yalnızca `en` ile tüm locale yaprağı eşliği: `npm run i18n:verify-locale-parity`.

Rapor dosyası: `docs/i18n-phase0-inventory.md` (frontend kökünden bir üst `docs/`).