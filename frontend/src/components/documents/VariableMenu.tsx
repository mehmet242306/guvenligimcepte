'use client';

import { useState } from 'react';
import {
  Building2, Users, Calendar, ShieldAlert, UserCog,
  Search, ChevronDown, ChevronRight, Copy, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DOCUMENT_VARIABLES, VARIABLE_GROUPS, type DocumentVariable } from '@/lib/document-variables';

const ICONS: Record<string, LucideIcon> = {
  Building2,
  Users,
  Calendar,
  ShieldAlert,
  UserCog,
};

interface VariableMenuProps {
  onInsert: (variableKey: string) => void;
}

export function VariableMenu({ onInsert }: VariableMenuProps) {
  const [search, setSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('firma');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = search
    ? DOCUMENT_VARIABLES.filter(
        (v) =>
          v.label.toLowerCase().includes(search.toLowerCase()) ||
          v.key.toLowerCase().includes(search.toLowerCase())
      )
    : DOCUMENT_VARIABLES;

  const handleInsert = (v: DocumentVariable) => {
    onInsert(v.key);
    setCopied(v.key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Değişkenler
      </h3>
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        Tıklayarak editöre ekleyin. Firma verilerinden otomatik doldurulur.
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Değişken ara..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
        />
      </div>

      {/* Groups */}
      {search ? (
        <div className="space-y-1">
          {filtered.map((v) => (
            <VariableItem key={v.key} variable={v} onInsert={handleInsert} isCopied={copied === v.key} />
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] py-2 text-center">Sonuç bulunamadı</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {VARIABLE_GROUPS.map((group) => {
            const Icon = ICONS[group.icon] || Building2;
            const items = filtered.filter((v) => v.group === group.key);
            const isExpanded = expandedGroup === group.key;

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Icon size={14} className="text-[var(--gold)]" />
                  <span>{group.label}</span>
                  <span className="ml-auto text-[var(--text-secondary)]">{items.length}</span>
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {items.map((v) => (
                      <VariableItem key={v.key} variable={v} onInsert={handleInsert} isCopied={copied === v.key} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VariableItem({
  variable,
  onInsert,
  isCopied,
}: {
  variable: DocumentVariable;
  onInsert: (v: DocumentVariable) => void;
  isCopied: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(variable)}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-[var(--gold)]/10 rounded-lg transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[var(--text-primary)] font-medium truncate">{variable.label}</div>
        <div className="text-[10px] text-[var(--text-secondary)] font-mono">{`{{${variable.key}}}`}</div>
      </div>
      {isCopied ? (
        <Check size={12} className="text-green-500 shrink-0" />
      ) : (
        <Copy size={12} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 shrink-0" />
      )}
    </button>
  );
}
