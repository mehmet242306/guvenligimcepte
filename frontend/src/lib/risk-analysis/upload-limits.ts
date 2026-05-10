/** Bu analiz oturumunda (tüm satırlar / workbench listesi) yüklenebilecek üst sınır */
export const MAX_RISK_ANALYSIS_IMAGES_TOTAL = 20;

/**
 * Tek dosya seçiminde işlenecek üst sınır (aynı zamanda toplam kotayla birlikte uygulanır).
 * Pratikte toplam 20 ile aynı tavanda kalır.
 */
export const MAX_IMAGES_PER_UPLOAD_BATCH = MAX_RISK_ANALYSIS_IMAGES_TOTAL;
