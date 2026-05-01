-- Platform admin: manuel teklif, ozel limit ve fiyat takibi (kurumsal/OSGB lead)

alter table public.enterprise_leads
  add column if not exists admin_notes text;

comment on column public.enterprise_leads.admin_notes is
  'Ic not: teklif tutari, ozel limitler, sozlesme referansi; sadece platform admin UI.';
