/**
 * Saha Risk Analizi — denetime uygun prompt kuralları (Fine-Kinney / inşaat sahası).
 * Kullanıcı şablonu ile senkron; token için özetlenmiş çekirdek kurallar.
 */

export const FIELD_REPORT_PROMPT_VERSION = "v3.0-saha-rapor-iskg";

export function buildFieldReportExpertRules(method: string): string {
  const fkBlock =
    method === "fine_kinney"
      ? `
FINE-KINNEY (zorunlu — seçilen yöntem):
- Her riskte fkParams: likelihood=P, exposure=F, severity=S (sayısal).
- Skor = P × F × S (model hesaplasın, skor alanı yazmasın; sunucu doğrular).
- pRationale, fRationale, sRationale: kısa Türkçe gerekçe (frekans varsayımı varsa belirt).
- Tek fotoğraf frekansı kesin göstermez; F için varsayım yapıldıysa açıkça yaz.
- P yalnızca olay olasılığı; F yalnızca maruziyet/frekans; S makul en ağır sonuç.
- Riskleri önem sırasına göre diz: ölümcül/kritik önce. Aynı tehlikeyi tekrarlama; grupla.
`
      : `
PUANLAMA: Seçilen yöntem (${method}) parametrelerini doldur; Fine-Kinney değilse fkParams opsiyonel.
`;

  return `
UZMAN ROLÜ: 15+ yıl A sınıfı İSG uzmanı, inşaat/yüksekte çalışma denetçisi, Fine-Kinney ve teknik rapor editörü.

TEMEL KURALLAR:
1. Yalnızca görselde açıkça görülen unsurlar "gozlemlenen_kanit" alanında; kesin olmayanlar "dogrulanacak_bilgi".
2. İşçi kimliği, yaş, eğitim, MYK, sertifika, sağlık veya niyet hakkında görselden kesin hüküm VERME.
3. "Emniyet kemeri yok" yerine net değilse: "emniyet kemeri/yaşam hattı görselde gözlemlenemiyor".
4. guven_duzeyi: "Yüksek" | "Orta" | "Düşük" (Türkçe).
5. Kontrol önerileri hiyerarşik: durdurma/ortadan kaldırma → toplu koruma → mühendislik → idari → KKD.
6. Mevzuat maddesi UYDURMA. Emin değilsen legalReferences boş bırak; legalContextSummary: "Mevzuat doğrulaması gerekli".
7. MYK/mesleki yeterlilik görselden tespit edilemez; yalnızca doküman kontrolü olarak dogrulanacak_bilgi'ye yazılabilir.

İNŞAAT / YÜKSEKTE ÖRNEKLER:
- Kenar koruması yoksa ana risk: yüksekten düşme.
- Ahşap/derme platform: stabilite, kapasite, sabitleme, boşluklar.
- Dik donatı uçları: saplanma/delici yaralanma.
- Baret/KKD görünmüyorsa: eksiklik olarak yaz; görünmeyen ekipman için kesin hüküm verme.
- Alt seviyede çalışan varsa: düşen cisim riski ayrı değerlendir.
- Uygunsuz merdiven/erişim: güvenli iniş-çıkış riski.

${fkBlock}

ÇIKTI: Yalnızca geçerli JSON. Markdown yok.
`;
}

export function buildFieldReportFastUserJsonExample(method: string): string {
  const fkFields =
    method === "fine_kinney"
      ? `
      "fkParams": {
        "likelihood": 6,
        "exposure": 3,
        "severity": 15,
        "pRationale": "Kenar koruması görünmüyor; düşme olasılığı yüksek.",
        "fRationale": "Fotoğraf anlık; frekans saha doğrulaması gerekli (varsayım: haftalık maruziyet).",
        "sRationale": "Yüksekten düşmede ağır yaralanma/ölüm makul sonuç."
      },`
      : `
      "fkParams": {"likelihood":3,"exposure":3,"severity":7,"pRationale":"","fRationale":"","sRationale":""},`;

  return `{
  "analysis_status": "success",
  "imageRelevance": "relevant",
  "imageDescription": "kısa görsel tanımı",
  "photoQuality": { "level": "good|moderate|poor", "note": "açı/mesafe sınırı" },
  "areaSummary": "yapılan iş, yükseklik potansiyeli, ekipman, çalışan konumu, genel risk seviyesi",
  "imageLimitations": ["fotoğraf açısı", "görünmeyen alanlar", "doğrulanacak bilgiler"],
  "personCount": 0,
  "faces": [],
  "positiveObservations": [],
  "risks": [
    {
      "title": "somut risk başlığı",
      "category": "Yüksekte çalışma / Düşme",
      "severity": "high",
      "confidence": 0.75,
      "guven_duzeyi": "Orta",
      "gozlemlenen_kanit": "Görselde açıkça görülen kanıt",
      "dogrulanacak_bilgi": "Saha doğrulaması gereken bilgiler",
      "olasi_sonuc": "Olası sonuç",
      "mevcut_kontrol": "Görülen mevcut kontroller veya eksiklik",
      ${fkFields}
      "acil_aksiyon": "Derhal/öncelikli uygulanabilir aksiyon",
      "recommendation": "Mevcut durum özeti (düzeltici ile aynı cümleyi tekrarlama)",
      "correctiveAction": "Düzeltici faaliyet",
      "preventiveAction": "Önleyici faaliyet",
      "artik_risk": "Önlem sonrası beklenen artık risk",
      "correctiveActionRequired": true,
      "pinX": 50, "pinY": 50, "boxX": 40, "boxY": 40, "boxW": 22, "boxH": 22,
      "legalReferences": [],
      "legalContextSummary": "Mevzuat doğrulaması gerekli"
    }
  ]
}`;
}
