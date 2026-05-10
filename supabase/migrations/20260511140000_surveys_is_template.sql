-- Sınav/anket kayıtlarında şablon işareti (özellikle sınav havuzu için)
alter table public.surveys
  add column if not exists is_template boolean not null default false;

comment on column public.surveys.is_template is 'True: içerik şablon olarak listede kalır; yayına alınırken veya manuel kaldırılınca false olur.';

create index if not exists idx_surveys_org_template
  on public.surveys (organization_id, is_template)
  where is_template = true;
