import ExcelJS from "exceljs";

// ─── Types ─────────────────────────────────────────────────────────────────

export type TimesheetExportData = {
  profileName: string;
  professionalTitle: string;
  certificateNo: string;
  month: number;       // 1-12
  year: number;
  daysInMonth: number;
  companies: { id: string; name: string }[];
  entries: { company_id: string; day: number; hours: number }[];
  // Header settings
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  footerNote: string;
  // Government payroll
  isGovernment: boolean;
  salaryCoefficient: number;
  baseIndicator: number;
  stampTaxRate: number;
};

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const MONTHS_TR_UPPER = ["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];

function isWeekend(y: number, m: number, d: number): boolean {
  const w = new Date(y, m - 1, d).getDay();
  return w === 0 || w === 6;
}

const BLUE = "0b5fc1";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "F0F0F0";
const DARK_GRAY = "E0E0E0";
const RED_BG = "FEE2E2";
const BLACK = "000000";

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "333333" } };
  return { top: side, bottom: side, left: side, right: side };
}

// ═══════════════════════════════════════════════════════════════════════════
// A) Puantaj Excel — Grid format (Company × Days)
// ═══════════════════════════════════════════════════════════════════════════

export async function exportTimesheetExcel(data: TimesheetExportData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RiskNova";
  const ws = wb.addWorksheet("Puantaj", { views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] });

  const totalCols = data.daysInMonth + 2; // Firma + days + TOPLAM

  // ── Antet (rows 1-3) ──
  if (data.headerLine1) {
    ws.mergeCells(1, 1, 1, totalCols);
    const c = ws.getCell(1, 1);
    c.value = data.headerLine1;
    c.font = { bold: true, size: 13 };
    c.alignment = { horizontal: "center" };
  }
  if (data.headerLine2) {
    ws.mergeCells(2, 1, 2, totalCols);
    const c = ws.getCell(2, 1);
    c.value = data.headerLine2;
    c.font = { size: 11 };
    c.alignment = { horizontal: "center" };
  }
  {
    ws.mergeCells(3, 1, 3, totalCols);
    const c = ws.getCell(3, 1);
    c.value = `${data.profileName} — ${MONTHS[data.month - 1]} ${data.year} Puantaj`;
    c.font = { bold: true, size: 12 };
    c.alignment = { horizontal: "center" };
  }

  // ── Header row (row 4) ──
  const headerValues: string[] = ["Firma"];
  for (let d = 1; d <= data.daysInMonth; d++) headerValues.push(String(d));
  headerValues.push("TOPLAM");

  const headerRow = ws.addRow(headerValues);
  headerRow.height = 22;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();

    // Weekend columns — red header
    if (colNumber >= 2 && colNumber <= data.daysInMonth + 1) {
      const day = colNumber - 1;
      if (isWeekend(data.year, data.month, day)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DC2626" } };
      }
    }
  });

  // Column widths
  ws.getColumn(1).width = 28;
  for (let i = 2; i <= data.daysInMonth + 1; i++) ws.getColumn(i).width = 4.5;
  ws.getColumn(data.daysInMonth + 2).width = 8;

  // ── Data rows ──
  const activeCompanies = data.companies.filter((c) =>
    data.entries.some((e) => e.company_id === c.id),
  );

  for (const company of activeCompanies) {
    const rowValues: (string | number)[] = [company.name];
    let compTotal = 0;
    for (let d = 1; d <= data.daysInMonth; d++) {
      const entry = data.entries.find((e) => e.company_id === company.id && e.day === d);
      if (entry) {
        rowValues.push(entry.hours);
        compTotal += entry.hours;
      } else {
        rowValues.push("");
      }
    }
    rowValues.push(compTotal);

    const row = ws.addRow(rowValues);
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder();
      cell.alignment = { horizontal: colNumber === 1 ? "left" : "center", vertical: "middle" };
      cell.font = { size: 9 };

      // Weekend columns
      if (colNumber >= 2 && colNumber <= data.daysInMonth + 1) {
        const day = colNumber - 1;
        if (isWeekend(data.year, data.month, day)) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_BG } };
        }
        // Filled cells
        if (cell.value && cell.value !== "") {
          cell.font = { bold: true, size: 9, color: { argb: BLUE } };
        }
      }

      // TOPLAM column
      if (colNumber === data.daysInMonth + 2) {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
      }

      // Firma column
      if (colNumber === 1) {
        cell.font = { size: 9 };
      }
    });
  }

  // ── TOPLAM row ──
  const totalValues: (string | number)[] = ["TOPLAM"];
  let grandTotal = 0;
  for (let d = 1; d <= data.daysInMonth; d++) {
    const dayTotal = data.entries.filter((e) => e.day === d).reduce((s, e) => s + e.hours, 0);
    totalValues.push(dayTotal || "");
    grandTotal += dayTotal;
  }
  totalValues.push(grandTotal);

  const totalRow = ws.addRow(totalValues);
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: colNumber === data.daysInMonth + 2 ? { argb: BLUE } : { argb: BLACK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_GRAY } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: colNumber === 1 ? "left" : "center", vertical: "middle" };
  });

  // ── Narrative text ──
  ws.addRow([]);
  const narrativeRowNum = ws.rowCount + 1;
  ws.mergeCells(narrativeRowNum, 1, narrativeRowNum + 1, totalCols);
  const narrativeCell = ws.getCell(narrativeRowNum, 1);
  const monthUpper = MONTHS_TR_UPPER[data.month - 1];
  narrativeCell.value = `Yukarıda belirtilen görevli ${data.profileName} tarafından ${data.year} yılı ${monthUpper} ayında toplam ${grandTotal} saat olmak üzere toplamda ${grandTotal} saat iş güvenliği hizmeti vermişlerdir.`;
  narrativeCell.font = { size: 10, italic: true };
  narrativeCell.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(narrativeRowNum).height = 35;

  // Footer note
  if (data.footerNote) {
    ws.addRow([]);
    const fnRow = ws.rowCount + 1;
    ws.mergeCells(fnRow, 1, fnRow, totalCols);
    const fnCell = ws.getCell(fnRow, 1);
    fnCell.value = data.footerNote;
    fnCell.font = { size: 9, italic: true, color: { argb: "666666" } };
  }

  // ── Signatures ──
  ws.addRow([]);
  ws.addRow([]);
  const sigRow = ws.rowCount + 1;
  ws.mergeCells(sigRow, 1, sigRow, Math.floor(totalCols / 3));
  ws.mergeCells(sigRow, totalCols - Math.floor(totalCols / 3) + 1, sigRow, totalCols);
  const s1 = ws.getCell(sigRow, 1);
  s1.value = "DÜZENLEYEN";
  s1.font = { bold: true, size: 10 };
  s1.alignment = { horizontal: "center" };
  const s2 = ws.getCell(sigRow, totalCols - Math.floor(totalCols / 3) + 1);
  s2.value = "ONAYLAYAN";
  s2.font = { bold: true, size: 10 };
  s2.alignment = { horizontal: "center" };

  const nameRow = sigRow + 4;
  ws.mergeCells(nameRow, 1, nameRow, Math.floor(totalCols / 3));
  ws.mergeCells(nameRow, totalCols - Math.floor(totalCols / 3) + 1, nameRow, totalCols);
  const n1 = ws.getCell(nameRow, 1);
  n1.value = `${data.profileName}\n${data.professionalTitle || "İş Güvenliği Uzmanı"}`;
  n1.font = { size: 9 };
  n1.alignment = { horizontal: "center", wrapText: true };
  const n2 = ws.getCell(nameRow, totalCols - Math.floor(totalCols / 3) + 1);
  n2.value = "İşveren / Yetkilisi";
  n2.font = { size: 9 };
  n2.alignment = { horizontal: "center" };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ═══════════════════════════════════════════════════════════════════════════
// B) Memur Bordrosu Excel — Official payroll format
// ═══════════════════════════════════════════════════════════════════════════

export async function exportPayrollExcel(data: TimesheetExportData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RiskNova";
  const ws = wb.addWorksheet("Bordro");

  const hourlyRate = data.baseIndicator * data.salaryCoefficient;
  const totalHours = data.entries.reduce((s, e) => s + e.hours, 0);
  const gross = hourlyRate * totalHours;
  const stampTax = gross * data.stampTaxRate;
  const net = gross - stampTax;

  // Column widths
  ws.getColumn(1).width = 6;   // S.N.
  ws.getColumn(2).width = 25;  // Adı Soyadı
  ws.getColumn(3).width = 14;  // Maaş Katsayısı
  ws.getColumn(4).width = 14;  // Ödeme Katsayısı
  ws.getColumn(5).width = 14;  // Saatlik Ücret
  ws.getColumn(6).width = 18;  // Görevlendirme Süresi
  ws.getColumn(7).width = 16;  // Brüt Tutar
  ws.getColumn(8).width = 16;  // Damga Vergisi
  ws.getColumn(9).width = 16;  // Net Ödenen

  // ── Antet (rows 1-3) ──
  ws.mergeCells("A1:I1");
  const h1 = ws.getCell("A1");
  h1.value = data.headerLine1 || "T.C.";
  h1.font = { bold: true, size: 13 };
  h1.alignment = { horizontal: "center" };

  ws.mergeCells("A2:I2");
  const h2 = ws.getCell("A2");
  h2.value = data.headerLine2 || "";
  h2.font = { size: 11 };
  h2.alignment = { horizontal: "center" };

  ws.mergeCells("A3:I3");
  const h3 = ws.getCell("A3");
  h3.value = data.headerLine3 || "";
  h3.font = { size: 11 };
  h3.alignment = { horizontal: "center" };

  // ── Month/Year info ──
  ws.addRow([]);
  ws.mergeCells("A4:I4");
  const periodCell = ws.getCell("A4");
  periodCell.value = `Ait Olduğu Ay: ${MONTHS[data.month - 1]}    Yıl: ${data.year}`;
  periodCell.font = { size: 10 };
  periodCell.alignment = { horizontal: "right" };

  // ── Title ──
  ws.addRow([]);
  ws.mergeCells("A5:I5");
  const titleCell = ws.getCell("A5");
  titleCell.value = "ÇEŞİTLİ ÖDEMELER BORDROSU";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  // ── Table header (row 7) ──
  ws.addRow([]);
  const headers = [
    "S.N.", "ADI SOYADI", "Memur Maaş\nKatsayısı", "Ödeme\nKatsayısı",
    "Saatlik\nÜcret (TL)", "Ödemeye Esas\nGörevlendirme\nSüresi (Saat)",
    "Ödemeye Esas\nBrüt Tutar (TL)", "Damga Vergisi\nKesintisi (TL)", "Net\nÖdenen (TL)",
  ];
  const hRow = ws.addRow(headers);
  hRow.height = 45;
  hRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_GRAY } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  // ── Data row (row 8) — the professional ──
  const fmtTL = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataRow = ws.addRow([
    1,
    data.profileName,
    data.salaryCoefficient,
    `${data.baseIndicator}`,
    fmtTL(hourlyRate),
    totalHours,
    fmtTL(gross),
    fmtTL(stampTax),
    fmtTL(net),
  ]);
  dataRow.eachCell((cell, col) => {
    cell.border = thinBorder();
    cell.alignment = { horizontal: col <= 2 ? "left" : "center", vertical: "middle" };
    cell.font = { size: 10 };
    if (col === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── Empty rows for additional entries (rows 9-17) ──
  for (let i = 2; i <= 10; i++) {
    const emptyRow = ws.addRow([i, "", "", "", "", "", "", "", ""]);
    emptyRow.eachCell((cell) => {
      cell.border = thinBorder();
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { size: 10 };
    });
  }

  // ── TOPLAM row ──
  const totRow = ws.addRow(["", "TOPLAM", "", "", "", totalHours, fmtTL(gross), fmtTL(stampTax), fmtTL(net)]);
  totRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_GRAY } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

  // ── Legal notice (6331/8) ──
  ws.addRow([]);
  ws.addRow([]);
  const legalRowNum = ws.rowCount + 1;
  ws.mergeCells(legalRowNum, 1, legalRowNum, 9);
  const legalCell = ws.getCell(legalRowNum, 1);
  legalCell.value = 'UYARI: Ödeme Bordrosu 6331 Sayılı İş Sağlığı ve Güvenliği Kanunun 8. Maddesi "Kamu kurum ve kuruluşlarında ilgili mevzuata göre çalıştırılan işyeri hekimi veya iş güvenliği uzmanı olma niteliğini haiz personel, gerekli belgeye sahip olmaları şartıyla asli görevlerinin yanında, belirlenen çalışma süresine riayet ederek çalışmakta oldukları kurumda veya ilgili personelin muvafakati ve üst yöneticinin onayı ile diğer kamu kurum ve kuruluşlarında görevlendirilebilir. Bu şekilde görevlendirilecek personele, görev yaptığı her saat için (200) gösterge rakamının memur aylık katsayısı ile çarpımı tutarında ilave ödeme, hizmet alan kurum tarafından yapılır. Bu ödemeden damga vergisi hariç herhangi bir kesinti yapılmaz. Bu durumdaki görevlendirmeye ilişkin ilave ödemelerde, günlük mesai saatlerine bağlı kalmak kaydıyla, aylık toplam seksen saatten fazla olan görevlendirmeler dikkate alınmaz." hükmüne uygun şekilde hazırlanmıştır.';
  legalCell.font = { size: 7, italic: true, color: { argb: "333333" } };
  legalCell.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(legalRowNum).height = 80;

  // Footer note
  if (data.footerNote) {
    ws.addRow([]);
    const fnRowNum = ws.rowCount + 1;
    ws.mergeCells(fnRowNum, 1, fnRowNum, 9);
    const fnCell = ws.getCell(fnRowNum, 1);
    fnCell.value = data.footerNote;
    fnCell.font = { size: 8, italic: true, color: { argb: "666666" } };
  }

  // ── Signatures ──
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);

  const sigRowNum = ws.rowCount + 1;
  ws.mergeCells(sigRowNum, 1, sigRowNum, 3);
  ws.mergeCells(sigRowNum, 7, sigRowNum, 9);
  const sig1 = ws.getCell(sigRowNum, 1);
  sig1.value = "DÜZENLEYEN";
  sig1.font = { bold: true, size: 10 };
  sig1.alignment = { horizontal: "center" };
  const sig2 = ws.getCell(sigRowNum, 7);
  sig2.value = "ONAYLAYAN";
  sig2.font = { bold: true, size: 10 };
  sig2.alignment = { horizontal: "center" };

  const nameRowNum = sigRowNum + 4;
  ws.mergeCells(nameRowNum, 1, nameRowNum, 3);
  ws.mergeCells(nameRowNum, 7, nameRowNum, 9);
  const n1 = ws.getCell(nameRowNum, 1);
  n1.value = `${data.profileName}\n${data.professionalTitle || "İş Güvenliği Uzmanı"}`;
  n1.font = { size: 9 };
  n1.alignment = { horizontal: "center", wrapText: true };
  const n2 = ws.getCell(nameRowNum, 7);
  n2.value = "İşveren / Yetkilisi";
  n2.font = { size: 9 };
  n2.alignment = { horizontal: "center" };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: trigger download
// ═══════════════════════════════════════════════════════════════════════════

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
