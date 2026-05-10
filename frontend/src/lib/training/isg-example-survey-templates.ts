import type { QuestionOption, SurveyQuestionRecord, SurveyRecord } from "@/lib/supabase/survey-api";

/**
 * Platform örnekleri — kullanıcı organizasyonuna kopyalanır (taslak).
 * Sınav şablonları isTemplate: true ile oluşturulur (mevcut ürün davranışı).
 */

export type IsgExampleSurveyTemplate = {
  id: string;
  survey: Pick<
    SurveyRecord,
    | "title"
    | "description"
    | "type"
    | "isTemplate"
    | "passScore"
    | "timeLimitMinutes"
    | "shuffleQuestions"
  >;
  questions: Array<
    Pick<SurveyQuestionRecord, "questionText" | "questionType" | "options" | "required" | "points">
  >;
};

function mcq(
  text: string,
  opts: { label: string; value: string; correct: boolean }[],
  points = 1
): Pick<SurveyQuestionRecord, "questionText" | "questionType" | "options" | "required" | "points"> {
  const options: QuestionOption[] = opts.map(o => ({
    label: o.label,
    value: o.value,
    isCorrect: o.correct,
  }));
  return {
    questionText: text,
    questionType: "multiple_choice",
    options,
    required: true,
    points,
  };
}

export const ISG_EXAMPLE_SURVEY_TEMPLATES: IsgExampleSurveyTemplate[] = [
  {
    id: "basic-awareness-exam",
    survey: {
      title: "Temel İSG Bilinci — Örnek Şablon Sınav",
      description:
        "Riskler, yükümlülükler ve güvenli davranışlara dair kısa çoktan seçmeli sınav. Şirketinize göre düzenleyebilirsiniz.",
      type: "exam",
      isTemplate: true,
      passScore: 70,
      timeLimitMinutes: 25,
      shuffleQuestions: false,
    },
    questions: [
      mcq("İSG’nin temel amacı aşağıdakilerden hangisidir?", [
        { label: "Üretimi durdurmak", value: "A", correct: false },
        { label: "İş kazalarını ve meslek hastalıklarını önlemek", value: "B", correct: true },
        { label: "Sadece maliyet düşürmek", value: "C", correct: false },
        { label: "Sadece denetim hazırlığı", value: "D", correct: false },
      ]),
      mcq("6331 sayılı İSG Kanunu kapsamında işverenin genel yükümlülüğü nedir?", [
        { label: "Riskleri değerlendirmek ve önlem almak", value: "A", correct: true },
        { label: "Sadece rapor tutmak", value: "B", correct: false },
        { label: "Yalnızca personele malzeme sağlamak", value: "C", correct: false },
        { label: "İSG ile ilgilenmemek", value: "D", correct: false },
      ]),
      mcq("İşyerinde güvenlik işaretleri ve uyarıların amacı nedir?", [
        { label: "Süsleme", value: "A", correct: false },
        { label: "Tehlikeleri ve zorunlu davranışları iletmek", value: "B", correct: true },
        { label: "Reklam yapmak", value: "C", correct: false },
        { label: "Ziyaretçileri uzak tutmak", value: "D", correct: false },
      ]),
      mcq("Acil durumlarda ilk yapılması gereken genel yaklaşım hangisidir?", [
        { label: "Paniklemek ve koşmak", value: "A", correct: false },
        { label: "Alarmı/tahliyeyi tetiklemek ve güvenli alana yönlendirmek", value: "B", correct: true },
        { label: "Her şeyi olduğu gibi bırakmak", value: "C", correct: false },
        { label: "Sosyal medyada paylaşmak", value: "D", correct: false },
      ]),
      mcq("Near-miss (ramak kala) olayların bildirilmesinin faydası nedir?", [
        { label: "Ceza riskini artırır", value: "A", correct: false },
        { label: "Önleyici iyileştirmeler için erken sinyal verir", value: "B", correct: true },
        { label: "Hiçbir faydası yoktur", value: "C", correct: false },
        { label: "Sadece idari yük oluşturur", value: "D", correct: false },
      ]),
      mcq("Manuel kaldırma sırasında doğru yaklaşım hangisidir?", [
        { label: "Sırtı kamburlaştırarak ani hareket", value: "A", correct: false },
        { label: "Mekanik işaret/kaldırma ekipmanı ve doğru teknik", value: "B", correct: true },
        { label: "Tek başına ağır yük kaldırmak", value: "C", correct: false },
        { label: "Emniyet kemeri kullanmamak", value: "D", correct: false },
      ]),
      mcq("İş sağlığı ve güvenliği eğitiminin amacı nedir?", [
        { label: "Sadece evrak tamamlamak", value: "A", correct: false },
        { label: "Farkındalık ve güvenli davranış becerisi kazandırmak", value: "B", correct: true },
        { label: "Çalışanı sınamak", value: "C", correct: false },
        { label: "İşten çıkarma gerekçesi oluşturmak", value: "D", correct: false },
      ]),
      mcq("İSG kültüründe çalışan katılımı için uygun davranış hangisidir?", [
        { label: "Önerileri görmezden gelmek", value: "A", correct: false },
        { label: "Risk bildirimi ve iyileştirme önerilerini teşvik etmek", value: "B", correct: true },
        { label: "Sadece üst yönetimin karar vermesi", value: "C", correct: false },
        { label: "Sürekli ceza odaklı yaklaşım", value: "D", correct: false },
      ]),
    ],
  },
  {
    id: "ppe-exam",
    survey: {
      title: "KKD ve Kişisel Koruyucu Donanım — Örnek Şablon Sınav",
      description:
        "Uygun KKD seçimi, kullanımı ve bakımına ilişkin örnek sorular. İşyeri risklerinize göre güncelleyin.",
      type: "exam",
      isTemplate: true,
      passScore: 75,
      timeLimitMinutes: 20,
      shuffleQuestions: true,
    },
    questions: [
      mcq("KKD seçiminde temel ilke hangisidir?", [
        { label: "En ucuz ürünü seçmek", value: "A", correct: false },
        { label: "Risk değerlendirmesine uygun koruma seviyesi", value: "B", correct: true },
        { label: "Sadece görünürlük", value: "C", correct: false },
        { label: "Personelin tercihi yeterlidir", value: "D", correct: false },
      ]),
      mcq("İşitme koruyucularında uygun kullanım için kritik nokta nedir?", [
        { label: "Tam oturma ve hijyen", value: "A", correct: true },
        { label: "Sadece ziyaretçiler için", value: "B", correct: false },
        { label: "Gürültülü alanda hiç takmamak", value: "C", correct: false },
        { label: "Haftada bir gün kullanmak", value: "D", correct: false },
      ]),
      mcq("Solunum koruyucu seçiminde hangi bilgi önemlidir?", [
        { label: "Tehdit edici madde/toz tipi ve konsantrasyon", value: "A", correct: true },
        { label: "Sadece renk", value: "B", correct: false },
        { label: "Marka logosu", value: "C", correct: false },
        { label: "Personelin ayakkabı numarası", value: "D", correct: false },
      ]),
      mcq("Baş koruyucu (baret) hangi durumlarda kullanılmalıdır?", [
        { label: "Düşen cisim riski olan alanlarda", value: "A", correct: true },
        { label: "Sadece ofiste", value: "B", correct: false },
        { label: "Hiçbir zaman", value: "C", correct: false },
        { label: "Sadece gece vardiyasında", value: "D", correct: false },
      ]),
      mcq("KKD bakımı ve muayenesi ile ilgili doğru ifade hangisidir?", [
        { label: "Hasarlı KKD kullanılmaya devam edilir", value: "A", correct: false },
        { label: "Üretici talimatlarına uygun kontrol ve değişim", value: "B", correct: true },
        { label: "Sadece yılda bir kontrol", value: "C", correct: false },
        { label: "Tüm KKD’ler ömür boyu kullanılır", value: "D", correct: false },
      ]),
      mcq("Kayarak düşmeye karşı ayakkabı seçiminde dikkat edilmesi gerekenlerden biri nedir?", [
        { label: "Kaygan yüzey uyumluluğu ve standartlara uygunluk", value: "A", correct: true },
        { label: "Sadece spor ayakkabı", value: "B", correct: false },
        { label: "Terlik kullanımı", value: "C", correct: false },
        { label: "Numara uyumsuzluğu sorun değildir", value: "D", correct: false },
      ]),
    ],
  },
  {
    id: "fire-safety-exam",
    survey: {
      title: "Yangın ve Tahliye — Örnek Şablon Sınav",
      description:
        "Yangın sınıfları, söndürücü kullanımı ve tahliye ilkelerine dair örnek sorular.",
      type: "exam",
      isTemplate: true,
      passScore: 70,
      timeLimitMinutes: 15,
      shuffleQuestions: false,
    },
    questions: [
      mcq("Yangın çıktığında öncelik sırası genellikle nasıl olmalıdır?", [
        { label: "Önce malzemeyi kurtarmak", value: "A", correct: false },
        { label: "Can güvenliği, alarm, söndürme uygunsa ve tahliye", value: "B", correct: true },
        { label: "Önce fotoğraf çekmek", value: "C", correct: false },
        { label: "Kapıları kilitleyip çıkmak", value: "D", correct: false },
      ]),
      mcq("Tahliye yollarında ne yapılmalıdır?", [
        { label: "Mal depolamak", value: "A", correct: false },
        { label: "Sürekli açık ve işaretli tutmak", value: "B", correct: true },
        { label: "Geçici olarak kapatmak", value: "C", correct: false },
        { label: "Sadece yangında açmak", value: "D", correct: false },
      ]),
      mcq("Su ile söndürülmemesi gereken yangın tipi örneği hangisidir?", [
        { label: "Yağ/yanıcı sıvı yangını (uygunsuz müdahale riski)", value: "A", correct: true },
        { label: "Kağıt yangını", value: "B", correct: false },
        { label: "Odun yangını", value: "C", correct: false },
        { label: "Tekstil yangını", value: "D", correct: false },
      ]),
      mcq("Yangın tatbikatlarının amacı nedir?", [
        { label: "Rol yapmak için", value: "A", correct: false },
        { label: "Tahliye ve müdahale becerilerini pekiştirmek", value: "B", correct: true },
        { label: "İşi aksatmak", value: "C", correct: false },
        { label: "Sadece fotoğraf arşivi", value: "D", correct: false },
      ]),
      mcq("Toplanma alanı (assembly point) ne işe yarar?", [
        { label: "Molayı uzatmak", value: "A", correct: false },
        { label: "Sayım ve güvenli birleşme noktası", value: "B", correct: true },
        { label: "Park yeri ayırmak", value: "C", correct: false },
        { label: "Depo alanı", value: "D", correct: false },
      ]),
    ],
  },
  {
    id: "employee-perception-survey",
    survey: {
      title: "Çalışan İSG Algısı — Örnek Anket",
      description:
        "İşyerinde İSG iletişimi, katılım ve kaynakların yeterliliğine dair anonim geri bildirim toplamak için örnek soru seti.",
      type: "survey",
      isTemplate: false,
      passScore: null,
      timeLimitMinutes: null,
      shuffleQuestions: false,
    },
    questions: [
      {
        questionText: "İSG ile ilgili bilgilendirmelerin sıklığı ve anlaşılırlığı (1: Çok zayıf — 5: Çok iyi)",
        questionType: "scale",
        options: null,
        required: true,
        points: 0,
      },
      {
        questionText: "Yöneticilerin güvenli çalışmayı teşvik ettiğini düşünüyor musunuz? (1: Hiç — 5: Kesinlikle)",
        questionType: "scale",
        options: null,
        required: true,
        points: 0,
      },
      {
        questionText: "Risk bildirdiğinizde geri bildirim aldığınızı düşünüyor musunuz? (1: Hiç — 5: Her zaman)",
        questionType: "scale",
        options: null,
        required: true,
        points: 0,
      },
      {
        questionText: "KKD ve iş ekipmanlarının kullanılabilirliği ve bakımı (1: Çok zayıf — 5: Çok iyi)",
        questionType: "scale",
        options: null,
        required: true,
        points: 0,
      },
      {
        questionText: "İSG konusunda iyileştirmek istediğiniz bir alanı kısaca yazınız.",
        questionType: "open_ended",
        options: null,
        required: false,
        points: 0,
      },
    ],
  },
  {
    id: "emergency-readiness-survey",
    survey: {
      title: "Acil Durum Hazırlığı — Öz-değerlendirme Anketi",
      description:
        "Ekip üyelerinin acil durum rolleri, tahliye ve ilk müdahale farkındalığını ölçmek için örnek anket.",
      type: "survey",
      isTemplate: false,
      passScore: null,
      timeLimitMinutes: null,
      shuffleQuestions: false,
    },
    questions: [
      {
        questionText: "Acil durum planını ve tahliye rotalarını biliyor musunuz?",
        questionType: "yes_no",
        options: [
          { label: "Evet", value: "yes" },
          { label: "Hayır", value: "no" },
        ],
        required: true,
        points: 0,
      },
      {
        questionText: "İlk yardım dolabı/kutu konumunu biliyor musunuz?",
        questionType: "yes_no",
        options: [
          { label: "Evet", value: "yes" },
          { label: "Hayır", value: "no" },
        ],
        required: true,
        points: 0,
      },
      {
        questionText: "Yangın söndürücü kullanımı konusunda kendinizi ne kadar yeterli görüyorsunuz? (1–5)",
        questionType: "scale",
        options: null,
        required: true,
        points: 0,
      },
      {
        questionText: "Kimyasal sızdırma veya gaz alarmı durumunda izlemeniz gereken prosedürü özetleyebilir misiniz? (Kısa yazınız)",
        questionType: "open_ended",
        options: null,
        required: false,
        points: 0,
      },
    ],
  },
];

export function exampleTemplateQuestionsForSave(
  def: IsgExampleSurveyTemplate
): Partial<SurveyQuestionRecord>[] {
  return def.questions.map((q, i) => ({
    questionText: q.questionText,
    questionType: q.questionType,
    options:
      q.questionType === "open_ended" || q.questionType === "scale"
        ? null
        : q.options,
    required: q.required,
    sortOrder: i,
    points: q.points,
  }));
}
