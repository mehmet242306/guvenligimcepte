# Faz 0 — i18n envanter raporu

Oluşturulma: 2026-05-02T08:11:03.199Z

## Yöntem

- **Kaynak taraması**: `src/**/*.ts(x)` satırlarında çift/tek tırnak stringleri; uzunluk, boşluk, Türkçe karakter ve teknik olmayan token sezgisi ile **şüpheli UI metni** sayısı.
- **Türkçe satır sayısı**: Satırda `ğüşıöçĞÜŞİÖÇİı` geçmesi (import/log satırları tam ayıklanamaz — yanlış pozitif/negatif olabilir).
- **Locale**: `messages/*.json` yaprağı (string leaf) yolları `en.json` ile karşılaştırıldı; aynı değer = İngilizce kopya sayılır.

### Limitler (yanlış pozitifler)

- **`lib/document-templates-*.ts`, `document-groups` vb.**: Çok sayıda gömülü şablon/hukuki paragraf stringi → şüpheli sayacı **çok yüksek**; bunlar ürün kararıyla ayrı bir “belge şablonu i18n” konusu olabilir, doğrudan UI checklist’i sayılmaz.
- **`lib/` genel**: Zod mesajları, sabit listeler, Türkçe içeren yardımcı veriler taramayı şişirir.
- **Öncelik**: Önce **`app/(public)`**, **`app/(protected)`**, **`components`** kovalarındaki dosyalar.

## Özet — modül kovaları (şüpheli string toplamı)

| Kovası | Dosya sayısı | Şüpheli string | Türkçe karakter içeren satır (toplam) |
|--------|-------------:|---------------:|---------------------------------------:|
| app/(public) | 28 | 630 | 152 |
| app/(protected) | 110 | 8063 | 1839 |
| app/other | 72 | 866 | 169 |
| components | 101 | 3560 | 896 |
| lib | 113 | 6685 | 4531 |
| src/other | 1 | 1 | 0 |

**Şüpheli string içeren dosya sayısı**: 425

## Locale dosyaları (`messages/*.json`)

**en.json string yaprağı sayısı**: 845

| Locale | Dosya boyutu (bayt) | Yaprak sayısı | en ile karşılaştırılabilir yaprak | Eksik anahtar (en’e göre) | Aynı değer (karşılaştırılabilir içinde) | % aynı (en) | Not |
|--------|--------------------:|--------------:|----------------------------------:|---------------------------:|----------------------------------------:|-------------:|-----|
| ar | 51594 | 843 | 843 | 2 | 705 | 83.6% |  |
| az | 50200 | 843 | 843 | 2 | 707 | 83.9% |  |
| de | 49952 | 843 | 843 | 2 | 710 | 84.2% |  |
| en | 49691 | 845 | — | — | — | 100 | source locale |
| es | 49583 | 843 | 843 | 2 | 708 | 84% |  |
| fr | 49645 | 843 | 843 | 2 | 709 | 84.1% |  |
| hi | 55534 | 843 | 843 | 2 | 707 | 83.9% |  |
| id | 49280 | 843 | 843 | 2 | 709 | 84.1% |  |
| ja | 50477 | 843 | 843 | 2 | 707 | 83.9% |  |
| ko | 49997 | 843 | 843 | 2 | 707 | 83.9% |  |
| ru | 52596 | 843 | 843 | 2 | 704 | 83.5% |  |
| tr | 52777 | 845 | 845 | 0 | 52 | 6.2% | primary translated locale (expect low % match to en) |
| zh | 48898 | 843 | 843 | 2 | 708 | 84% |  |

### Yorum

- **tr**: ~%6.2 aynı metin (`en` ile); **asıl Türkçe locale** olarak kullanılıyor (845 yaprak, eksik anahtar yok).
- **ar, az, de, es, fr, hi, id, ja, ko, ru, zh**: ~%83–84 değer `en` ile **birebir aynı**; kalanı küçük farklar (ör. `nav` çevirisi, yerelleştirilmiş tek satırlar). **Eksik anahtar**: `en`e göre çoğunda **2** yaprak (rapor anında); tam senkron için `en.json` ile diff önerilir.
- **Özet**: İkinci tam çeviri dili pratikte **tr**; diğerleri çoğunlukla **İngilizce içerik + sınırlı yerelleştirme**.

## Dosya bazlı checklist (şüpheli string sayısına göre, ilk 120)

| Şüpheli str. | TR satır* | Dosya |
|-------------:|----------:|-------|
| 807 | 710 | `src/lib/document-templates-g3.ts` |
| 755 | 646 | `src/lib/document-templates-g5.ts` |
| 743 | 538 | `src/lib/document-templates-g2.ts` |
| 589 | 558 | `src/lib/document-templates-g4.ts` |
| 530 | 183 | `src/components/companies/WorkspaceTabs.tsx` |
| 462 | 187 | `src/app/(protected)/risk-analysis/RiskAnalysisClient.tsx` |
| 461 | 80 | `src/lib/turkey-locations.ts` |
| 356 | 96 | `src/app/(protected)/isg-library/IsgLibraryClient.tsx` |
| 351 | 278 | `src/lib/document-templates-g6.ts` |
| 296 | 2 | `src/app/(protected)/osgb/documents/page.tsx` |
| 264 | 81 | `src/components/companies/PersonnelManagementPanel.tsx` |
| 251 | 233 | `src/lib/document-templates-g1.ts` |
| 239 | 120 | `src/app/(protected)/incidents/new/NewIncidentWizard.tsx` |
| 221 | 24 | `src/app/(protected)/profile/ProfileClient.tsx` |
| 217 | 1 | `src/lib/platform-admin/demo-localization.ts` |
| 210 | 0 | `src/app/(protected)/platform-admin/page.tsx` |
| 208 | 139 | `src/lib/risk-scoring.ts` |
| 189 | 70 | `src/components/companies/TeamManagementTab.tsx` |
| 188 | 68 | `src/app/(protected)/timesheet/TimesheetClient.tsx` |
| 188 | 166 | `src/lib/document-templates-p1.ts` |
| 182 | 0 | `src/app/(protected)/settings/SelfHealingTab.tsx` |
| 182 | 156 | `src/lib/document-groups.ts` |
| 172 | 58 | `src/app/(protected)/planner/PlannerClient.tsx` |
| 172 | 58 | `src/app/(protected)/training/slides/[id]/edit/SlideEditorClient.tsx` |
| 162 | 2 | `src/components/chat/ChatWidget.tsx` |
| 160 | 42 | `src/app/(protected)/companies/CompaniesListClient.tsx` |
| 158 | 10 | `src/app/(protected)/digital-twin/page.tsx` |
| 153 | 46 | `src/app/(protected)/dashboard/DashboardClient.tsx` |
| 152 | 46 | `src/app/(protected)/training/new/TrainingNewClient.tsx` |
| 151 | 71 | `src/app/(protected)/planner/YearlyTrainingTab.tsx` |
| 150 | 0 | `src/app/(protected)/workspace/onboarding/WorkspaceOnboardingClient.tsx` |
| 146 | 2 | `src/lib/mailer.ts` |
| 143 | 67 | `src/app/(protected)/planner/YearlyWorkPlanTab.tsx` |
| 142 | 0 | `src/app/(protected)/settings/KvkkCenterTab.tsx` |
| 140 | 37 | `src/app/(protected)/training/[id]/TrainingDetailClient.tsx` |
| 133 | 6 | `src/app/(protected)/settings/AdminAITab.tsx` |
| 131 | 0 | `src/app/(protected)/settings/AIUsageTab.tsx` |
| 131 | 101 | `src/lib/chat-knowledge.ts` |
| 130 | 1 | `src/app/(protected)/settings/page.tsx` |
| 128 | 46 | `src/app/(protected)/documents/DocumentsClient.tsx` |
| 121 | 34 | `src/app/(protected)/personnel/[id]/PersonnelProfileClient.tsx` |
| 115 | 4 | `src/app/api/analyze-risk/route.ts` |
| 114 | 109 | `src/app/(protected)/score-history/_data/starter-templates.ts` |
| 110 | 0 | `src/app/(protected)/settings/KvkkTransferAndBreachPanel.tsx` |
| 110 | 44 | `src/components/analysis/MortPanel.tsx` |
| 109 | 56 | `src/app/(protected)/incidents/[id]/dof/DofClient.tsx` |
| 109 | 36 | `src/app/(protected)/training/slides/SlideLibraryClient.tsx` |
| 108 | 41 | `src/lib/r2d-rca-pdf-template.ts` |
| 106 | 0 | `src/app/api/document-ai/route.ts` |
| 106 | 111 | `src/lib/scat-pdf-template.ts` |
| 102 | 13 | `src/components/layout/protected-shell.tsx` |
| 101 | 2 | `src/components/documents/AIAssistantPanel.tsx` |
| 100 | 0 | `src/app/(protected)/settings/KvkkDataRightsPanel.tsx` |
| 97 | 72 | `src/lib/mort-pdf-template.ts` |
| 91 | 29 | `src/app/(protected)/training/certificates/CertificatesClient.tsx` |
| 91 | 50 | `src/components/companies/CompanySharedOpsPanel.tsx` |
| 89 | 2 | `src/app/(protected)/osgb/firms/OsgbFirmsClient.tsx` |
| 87 | 53 | `src/app/(protected)/corrective-actions/[id]/CorrectiveActionDetailClient.tsx` |
| 86 | 4 | `src/components/analysis/BowTiePanel.tsx` |
| 86 | 33 | `src/components/analysis/R2dRcaPanel.tsx` |
| 84 | 0 | `src/app/(public)/page.tsx` |
| 84 | 27 | `src/components/companies/InviteProfessionalModal.tsx` |
| 83 | 48 | `src/app/(protected)/incidents/[id]/IncidentDetailClient.tsx` |
| 83 | 23 | `src/components/companies/OrganizationPanel.tsx` |
| 81 | 62 | `src/lib/risk-analysis-export.ts` |
| 80 | 0 | `src/app/(protected)/settings/UserManagementTab.tsx` |
| 80 | 20 | `src/app/(protected)/training/TrainingClient.tsx` |
| 77 | 31 | `src/app/(protected)/documents/[id]/DocumentEditorClient.tsx` |
| 75 | 18 | `src/app/(public)/survey/[token]/SurveyFillClient.tsx` |
| 72 | 0 | `src/app/(protected)/osgb/contracts/page.tsx` |
| 71 | 1 | `src/app/(protected)/platform-admin/demo-builder/DemoBuilderClient.tsx` |
| 70 | 6 | `src/app/(protected)/training/slides/[id]/present/PresenterClient.tsx` |
| 69 | 0 | `src/app/api/workspaces/onboarding/route.ts` |
| 68 | 1 | `src/app/(protected)/osgb/personnel/page.tsx` |
| 67 | 0 | `src/app/(public)/pricing/PricingPlansClient.tsx` |
| 65 | 11 | `src/app/(protected)/score-history/_lib/constants.ts` |
| 64 | 55 | `src/components/analysis/RcaIntroPanel.tsx` |
| 64 | 44 | `src/lib/company-share-registry.ts` |
| 63 | 0 | `src/components/ui/premium-icon-badge.tsx` |
| 60 | 12 | `src/app/(public)/certificate/verify/[id]/CertificateVerifyClient.tsx` |
| 59 | 0 | `src/app/(protected)/osgb/tasks/OsgbTasksBoardClient.tsx` |
| 58 | 13 | `src/app/(protected)/companies/[id]/CompanyScanData.tsx` |
| 58 | 14 | `src/app/(protected)/companies/[id]/CompanyWorkspaceClient.tsx` |
| 58 | 0 | `src/components/auth/RegisterCommercialPlans.tsx` |
| 57 | 0 | `src/app/(protected)/incidents/[id]/ishikawa/IshikawaClient.tsx` |
| 57 | 0 | `src/app/(protected)/platform-admin/legal-corpus/LegalCorpusAdminClient.tsx` |
| 56 | 0 | `src/app/(protected)/osgb/page.tsx` |
| 56 | 0 | `src/app/(protected)/settings/TenantLegalLibraryPanel.tsx` |
| 55 | 3 | `src/app/(public)/share/risk/[token]/SharedRiskAnalysisView.tsx` |
| 54 | 0 | `src/app/(protected)/platform-admin/demo-builder/DemoGroupsClient.tsx` |
| 54 | 1 | `src/components/companies/OhsFileTab.tsx` |
| 53 | 0 | `src/app/(protected)/settings/ErrorLogsTab.tsx` |
| 52 | 12 | `src/app/(protected)/incidents/AnalizlerContent.tsx` |
| 52 | 1 | `src/app/(protected)/osgb/personnel/OsgbPersonnelInviteCard.tsx` |
| 52 | 54 | `src/lib/company-directory.ts` |
| 51 | 11 | `src/app/(protected)/digital-twin/LiveStreamViewer.tsx` |
| 50 | 38 | `src/app/(protected)/rca/[incidentId]/RcaResultsClient.tsx` |
| 49 | 0 | `src/app/(protected)/profile/ProfileDataRightsPanel.tsx` |
| 49 | 1 | `src/lib/nova-ui.ts` |
| 48 | 0 | `src/app/(protected)/settings/AdminDocumentsTab.tsx` |
| 48 | 0 | `src/app/(protected)/settings/DatabaseHealthTab.tsx` |
| 48 | 48 | `src/lib/nova/site-map.ts` |
| 47 | 0 | `src/app/(protected)/settings/SecurityEventsTab.tsx` |
| 46 | 16 | `src/app/(protected)/digital-twin/CategoryRiskView.tsx` |
| 46 | 31 | `src/components/incidents/DofOsgbForm.tsx` |
| 46 | 36 | `src/app/api/ai/analysis/route.ts` |
| 45 | 0 | `src/app/(protected)/incidents/IncidentsListClient.tsx` |
| 45 | 0 | `src/app/(protected)/platform-admin/leads/_components/LeadsTable.tsx` |
| 45 | 70 | `src/lib/ai/openai-vision.ts` |
| 45 | 28 | `src/lib/document-variables.ts` |
| 45 | 14 | `src/lib/supabase/tracking-api.ts` |
| 44 | 18 | `src/app/(public)/invite/[id]/page.tsx` |
| 43 | 25 | `src/app/(protected)/corrective-actions/CorrectiveActionsClient.tsx` |
| 43 | 24 | `src/app/(protected)/score-history/_components/tabs/NovaTab.tsx` |
| 43 | 11 | `src/app/(protected)/training/slides/[id]/analytics/DeckAnalyticsClient.tsx` |
| 43 | 0 | `src/components/auth/RegisterAccountTypePreview.tsx` |
| 43 | 10 | `src/components/slides/MediaPickerModal.tsx` |
| 42 | 11 | `src/app/(protected)/score-history/_components/tabs/ActiveInspectionTab.tsx` |
| 42 | 19 | `src/app/(protected)/score-history/_components/tabs/ClosureTab.tsx` |
| 42 | 14 | `src/components/dashboard/DashboardTrackingSummary.tsx` |

*… ve 305 dosya daha (tam liste için script çıktısını genişletin).*

\* *Türkçe satır*: heuristic; string içinde veya yorumda Türkçe geçebilir.*

## Faz 0 tamamlandı

- [x] Kaynak kod sezgisel taraması
- [x] Kovası özet tablosu
- [x] Locale vs `en.json` yaprağı karşılaştırması

Rapor dosyası: `docs/i18n-phase0-inventory.md` (frontend kökünden bir üst `docs/`).