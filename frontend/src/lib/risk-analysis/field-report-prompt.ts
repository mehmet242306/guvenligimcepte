/**
 * Saha Risk Analizi — denetime uygun prompt kuralları (Fine-Kinney / inşaat sahası).
 */

export const FIELD_REPORT_PROMPT_VERSION = "v4.1-isg-scope-qc";

export function buildFieldReportExpertRules(method: string): string {
  const fkBlock =
    method === "fine_kinney"
      ? `
FINE-KINNEY: fkParams.likelihood=P, exposure=F, severity=S. pRationale, fRationale, sRationale zorunlu.
Skor = P×F×S. Tek fotoğrafta frekans kesin değil; F varsayımsa belirt.
`
      : `PUANLAMA: Yöntem ${method}; fkParams opsiyonel.`;

  return `
KRİTİK GÜVENLİK:
- Analiz başarısızsa ASLA "risk yok" veya risks=[] ile başarılı dönme.
- analysis_status="failed", risk_count=null (0 YAZMA), risks=[].
- "Kayıtlı risk yok" ifadesi kullanma.
- İSG dışı görseli risk tablosuna çevirme. Ev, aile, çocuk, bebek, sosyal ortam veya kişisel fotoğraf varsa scope_decision="exclude", scene_type="non_workplace", isg_kapsaminda_mi=false, risk_count=0, zero_risk_allowed=false, risks=[].
- Kapsam dışı görsele Fine-Kinney puanı, DÖF, sorumlu, termin veya mevzuat bağlama üretme.
- zero_risk_allowed kapsam dışı görseller için kullanılmaz; yalnızca başarılı analiz edilmiş gerçek İSG görselinde görünür tehlike yoksa true olabilir.
- scene_type=construction_site ise zero_risk_allowed=false; risks boş bırakılamaz (başarılı analizde).

İNŞAAT GÖRSELİ (çalışan/yükseklik/kenar/iskele/merdiven/donatı/kazı/makine varsa):
Önce preAnalysis doldur. Zorunlu kontrol: yüksekten düşme, açık kenar, platform/iskele, merdiven, donatı, düşen cisim, KKD, zemin, eş zamanlı kat, MYK doküman kontrolü.
Görünmüyorsa checklist_notlari'nda "gözlemlenmedi" yaz; analiz başarısızsa "değerlendirilemedi".

GÖRSEL KURALLARI:
1. Yüksekte çalışma varsa ilk risk: yüksekten düşme.
2. Açık kenar → kritik değerlendir.
3. Ahşap platform → stabilite, kapasite, kayma.
4. Donatı ucu → saplanma.
5. KKD görünmüyorsa: "görselde gözlemlenemiyor; saha doğrulaması gerekli".
6. MYK/belge → dokuman_kontrol_maddeleri; risk puanına dahil etme.
7. Aynı tehlikeyi tekrarlama; grupla.
8. "Belgesiz işçi", "MYK yok", "eğitim yok", "sağlık raporu yok" gibi belge durumları görselden tespit edilemez; dokuman_kontrol_maddeleri alanına yazılır.
9. Mevzuat maddesi uydurma; emin değilsen legalContextSummary="Mevzuat doğrulaması gerekli" yaz.

${fkBlock}
ÇIKTI: Yalnızca JSON. Markdown yok.
`;
}

export function buildFieldReportFastUserJsonExample(method: string): string {
  const fkFields =
    method === "fine_kinney"
      ? `"fkParams":{"likelihood":6,"exposure":3,"severity":15,"pRationale":"...","fRationale":"...","sRationale":"..."},`
      : "";

  return `{
  "analysis_status": "success",
  "image_analysis_status": "success",
  "risk_count": 2,
  "zero_risk_allowed": false,
  "preAnalysis": {
    "gorsel_kodu": "G1",
    "dosya_adi": "",
    "scene_type": "construction_site",
    "isg_kapsaminda_mi": true,
    "contains_workers": true,
    "contains_work_activity": true,
    "contains_work_at_height": true,
    "contains_open_edge": true,
    "contains_scaffold_or_platform": false,
    "contains_ladder": false,
    "contains_rebar": true,
    "contains_machinery": false,
    "contains_ppe_issue": false,
    "image_analysis_status": "success",
    "zero_risk_allowed": false,
    "scope_decision": "analyze",
    "scope_reason": "Görsel şantiye / mesleki faaliyet içeriyor."
  },
  "checklist_notlari": {
    "yuksekten_dusme": "değerlendirildi",
    "acik_kenar": "gözlemlendi",
    "platform_iskele": "gözlemlenmedi",
    "merdiven": "gözlemlenmedi",
    "donati": "gözlemlendi",
    "dusen_cisim": "gözlemlenmedi",
    "kkd": "görselde gözlemlenemiyor",
    "zemin": "değerlendirildi",
    "es_zamanli_kat": "gözlemlenmedi",
    "myk_dokuman": "doküman kontrolü gerekli"
  },
  "imageRelevance": "relevant",
  "imageDescription": "kısa tanım",
  "photoQuality": {"level":"moderate","note":"açı sınırı"},
  "areaSummary": "saha özeti",
  "imageLimitations": ["görünmeyen alanlar"],
  "personCount": 1,
  "faces": [],
  "positiveObservations": [],
  "dokuman_kontrol_maddeleri": ["MYK/yüksekte çalışma belgesi saha dosyasında doğrulanmalı"],
  "risks": [{
    "title": "Yüksekten düşme — açık kenar",
    "category": "Yüksekte çalışma",
    "severity": "critical",
    "confidence": 0.8,
    "guven_duzeyi": "Yüksek",
    "gozlemlenen_kanit": "...",
    "dogrulanacak_bilgi": "...",
    ${fkFields}
    "acil_aksiyon": "...",
    "correctiveAction": "...",
    "preventiveAction": "...",
    "pinX":50,"pinY":50,"boxX":40,"boxY":40,"boxW":22,"boxH":22,
    "legalReferences":[],
    "legalContextSummary": "Mevzuat doğrulaması gerekli"
  }]
}

Başarısız analiz örneği (görsel okunamadığında):
{"analysis_status":"failed","image_analysis_status":"failed","risk_count":null,"zero_risk_allowed":false,"preAnalysis":{"scene_type":"unclear","isg_kapsaminda_mi":false,"image_analysis_status":"failed","zero_risk_allowed":false,"scope_decision":"manual_review_required","scope_reason":"Görsel analiz edilemedi; 0 risk anlamına gelmez."},"risks":[],"analysis_error":"Görsel analiz edilemedi"}

Kapsam dışı görsel örneği:
{"analysis_status":"success","image_analysis_status":"success","risk_count":0,"zero_risk_allowed":false,"preAnalysis":{"scene_type":"non_workplace","isg_kapsaminda_mi":false,"contains_workers":false,"contains_work_activity":false,"contains_work_at_height":false,"contains_open_edge":false,"contains_scaffold_or_platform":false,"contains_ladder":false,"contains_rebar":false,"contains_machinery":false,"contains_ppe_issue":false,"image_analysis_status":"success","zero_risk_allowed":false,"scope_decision":"exclude","scope_reason":"Bu görsel işyeri / saha / mesleki faaliyet içermediği için İSG risk analizinden hariç tutuldu."},"imageRelevance":"not_workplace","risks":[]}`;
}
