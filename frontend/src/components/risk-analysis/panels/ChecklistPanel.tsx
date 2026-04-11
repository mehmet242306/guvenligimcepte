"use client";

import {
  type ChecklistValues,
  type ChecklistResult,
  type ChecklistItem,
  calculateChecklist,
} from "@/lib/risk-scoring";

interface ChecklistPanelProps {
  checklistValues: ChecklistValues;
  checklistResult: ChecklistResult | null;
  onValuesChange: (values: ChecklistValues) => void;
}

const inputClass = "h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground";

const statusOptions: { value: ChecklistItem["status"]; label: string; color: string }[] = [
  { value: "uygun", label: "Uygun", color: "bg-emerald-500" },
  { value: "kismi", label: "Kısmi", color: "bg-amber-500" },
  { value: "uygun_degil", label: "Uygun Değil", color: "bg-red-500" },
  { value: "na", label: "N/A", color: "bg-slate-400" },
];

export function ChecklistPanel({ checklistValues, checklistResult, onValuesChange }: ChecklistPanelProps) {
  const result = checklistResult ?? calculateChecklist(checklistValues);

  const updateItem = (idx: number, field: keyof ChecklistItem, value: string | number) => {
    const items = [...checklistValues.items];
    items[idx] = { ...items[idx], [field]: value };
    onValuesChange({ ...checklistValues, items });
  };

  const addItem = () => {
    onValuesChange({
      ...checklistValues,
      items: [...checklistValues.items, { id: crypto.randomUUID(), text: "", status: "uygun" as const, weight: 1 }],
    });
  };

  const removeItem = (idx: number) => {
    if (checklistValues.items.length <= 1) return;
    onValuesChange({ ...checklistValues, items: checklistValues.items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: result.color }}>
          %{result.compliancePercent}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{result.label}</p>
          <p className="text-xs text-muted-foreground">{result.action}</p>
        </div>
      </div>

      {/* Compliance bar */}
      <div className="space-y-1">
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${result.compliancePercent}%`, backgroundColor: result.color }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{result.compliantCount} uygun</span>
          <span>{result.partialCount} kısmi</span>
          <span>{result.nonCompliantCount} uygun değil</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Kontrol Maddeleri ({checklistValues.items.length})</span>
          <button type="button" onClick={addItem} className="text-xs font-semibold text-[var(--accent)] hover:underline">+ Ekle</button>
        </div>
        {checklistValues.items.map((item, idx) => (
          <div key={item.id} className="space-y-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <input type="text" value={item.text} onChange={(e) => updateItem(idx, "text", e.target.value)} className={`${inputClass} flex-1`} placeholder="Kontrol maddesi..." />
              {checklistValues.items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1" title="Sil">x</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden flex-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateItem(idx, "status", opt.value)}
                    className={`flex-1 px-1.5 py-1 text-[10px] font-semibold transition-colors ${item.status === opt.value ? `${opt.color} text-white` : "bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select value={item.weight} onChange={(e) => updateItem(idx, "weight", Number(e.target.value))} className="h-8 w-14 rounded-lg border border-border bg-card px-1 text-xs text-foreground text-center">
                <option value={1}>x1</option>
                <option value={2}>x2</option>
                <option value={3}>x3</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
