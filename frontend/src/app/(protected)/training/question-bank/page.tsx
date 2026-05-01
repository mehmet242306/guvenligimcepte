import { redirect } from "next/navigation";

/** Soru bankası üründen kaldırıldı; eski bağlantılar eğitim modülüne yönlendirilir. */
export default function QuestionBankPage() {
  redirect("/training");
}
