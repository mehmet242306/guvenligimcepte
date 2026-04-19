-- Seed: OHS certifications for the four pilot jurisdictions (TR, US, GB, DE).
--
-- Level-1 role_key is universal. Level-2 rows below are country-specific
-- certifications that map to the same role_key. The onboarding UI filters
-- this table by (country_code, role_key) to show only relevant options.
--
-- All inserts use ON CONFLICT DO NOTHING so re-running the migration is safe.
-- Adding a new country later = append rows; never modify existing ones.

BEGIN;

-- ---------------------------------------------------------------------------
-- TR — Türkiye
-- Authority: Çalışma ve Sosyal Güvenlik Bakanlığı (ÇSGB)
-- Source: 6331 Sayılı İş Sağlığı ve Güvenliği Kanunu
-- ---------------------------------------------------------------------------
-- NOTE: OSGB Manager and ISO 45001 Lead Auditor are intentionally excluded
-- from the base seed. They are reserved for the enterprise / OSGB tier and
-- will be introduced via a separate addon migration together with pricing.
INSERT INTO public.certifications (country_code, role_key, code, name_en, name_local, issuer, level) VALUES
  ('TR', 'safety_professional',   'ISG-A',  'OHS Specialist Class A',       'İSG Uzmanı (A Sınıfı)',   'ÇSGB', 'A'),
  ('TR', 'safety_professional',   'ISG-B',  'OHS Specialist Class B',       'İSG Uzmanı (B Sınıfı)',   'ÇSGB', 'B'),
  ('TR', 'safety_professional',   'ISG-C',  'OHS Specialist Class C',       'İSG Uzmanı (C Sınıfı)',   'ÇSGB', 'C'),
  ('TR', 'occupational_physician','IYH',    'Workplace Physician',          'İşyeri Hekimi',           'ÇSGB', NULL),
  ('TR', 'safety_officer',        'DSP',    'Other Health Personnel',       'Diğer Sağlık Personeli',  'ÇSGB', NULL)
ON CONFLICT (country_code, code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- US — United States
-- Primary authorities: BCSP (Board of Certified Safety Professionals),
--                      ABIH (American Board of Industrial Hygiene),
--                      OSHA (regulator, not certifier).
-- ---------------------------------------------------------------------------
INSERT INTO public.certifications (country_code, role_key, code, name_en, name_local, issuer, level) VALUES
  ('US', 'safety_professional',   'CSP',    'Certified Safety Professional',         NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'ASP',    'Associate Safety Professional',         NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'OHST',   'Occupational Health and Safety Technician', NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'CHST',   'Construction Health and Safety Technician', NULL, 'BCSP', NULL),
  ('US', 'industrial_hygienist',  'CIH',    'Certified Industrial Hygienist',        NULL, 'ABIH', NULL),
  ('US', 'industrial_hygienist',  'CAIH',   'Certified Associate Industrial Hygienist', NULL, 'ABIH', NULL),
  ('US', 'occupational_physician','ABPM-OM','Board Certified in Occupational Medicine', NULL, 'ABPM', NULL),
  ('US', 'safety_officer',        'OSHA-30','OSHA 30-Hour Outreach',                 NULL, 'OSHA',  '30h')
ON CONFLICT (country_code, code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- GB — United Kingdom
-- Primary authorities: IOSH (Institution of Occupational Safety and Health),
--                      NEBOSH (National Examination Board in OH&S),
--                      HSE (Health and Safety Executive, regulator).
-- ---------------------------------------------------------------------------
INSERT INTO public.certifications (country_code, role_key, code, name_en, name_local, issuer, level) VALUES
  ('GB', 'safety_professional',   'CMIOSH',       'Chartered Member of IOSH',           NULL, 'IOSH',   'Chartered'),
  ('GB', 'safety_professional',   'GradIOSH',     'Graduate Member of IOSH',            NULL, 'IOSH',   'Graduate'),
  ('GB', 'safety_professional',   'TechIOSH',     'Technical Member of IOSH',           NULL, 'IOSH',   'Technical'),
  ('GB', 'safety_professional',   'NEB-NAT-DIP',  'NEBOSH National Diploma',            NULL, 'NEBOSH', NULL),
  ('GB', 'safety_professional',   'NEB-INT-DIP',  'NEBOSH International Diploma',       NULL, 'NEBOSH', NULL),
  ('GB', 'safety_professional',   'NEB-IGC',      'NEBOSH International General Certificate', NULL, 'NEBOSH', NULL),
  ('GB', 'occupational_physician','FOM',          'Fellow of the Faculty of Occupational Medicine', NULL, 'FOM',  NULL),
  ('GB', 'industrial_hygienist',  'CertOH',       'Certificate of Operational Competence in OH', NULL, 'BOHS', NULL)
ON CONFLICT (country_code, code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- DE — Deutschland
-- Primary authorities: BG (Berufsgenossenschaften),
--                      DGUV (Deutsche Gesetzliche Unfallversicherung),
--                      BÄK (Bundesärztekammer).
-- Law: Arbeitsschutzgesetz (ArbSchG), ASiG (Gesetz über Betriebsärzte,
--      Sicherheitsingenieure und andere Fachkräfte für Arbeitssicherheit).
-- ---------------------------------------------------------------------------
INSERT INTO public.certifications (country_code, role_key, code, name_en, name_local, issuer, level) VALUES
  ('DE', 'safety_officer',        'SIFA',    'Safety Specialist',                'Fachkraft für Arbeitssicherheit', 'BG',    NULL),
  ('DE', 'safety_officer',        'SIBE',    'Safety Representative',            'Sicherheitsbeauftragter',         'BG',    NULL),
  ('DE', 'safety_professional',   'SI-ING',  'Safety Engineer',                  'Sicherheitsingenieur',            'VDSI',  NULL),
  ('DE', 'occupational_physician','BETR-ARZT','Occupational Physician',          'Betriebsarzt',                    'BÄK',   NULL),
  ('DE', 'industrial_hygienist',  'AMTECH',  'Occupational Hygiene Technician',  'Fachkraft für Arbeitshygiene',    'DGUV',  NULL)
ON CONFLICT (country_code, code) DO NOTHING;

COMMIT;
