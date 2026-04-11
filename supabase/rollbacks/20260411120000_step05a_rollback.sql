-- =============================================================================
-- Rollback: 20260411120000_step05a_super_admin_infra
-- Tarih: 2026-04-11
-- Plan referansi: docs/database-hardening-plan.md Bolum 13.4
--
-- ONEMLI — BU DOSYA supabase/rollbacks/ KLASORUNDEDIR
-- Supabase CLI otomatik olarak uygulamaz. Manuel calistirilir:
--   * psql ile: psql $DATABASE_URL -f supabase/rollbacks/20260411120000_step05a_rollback.sql
--   * Supabase SQL Editor: dosya icerigini yapistir ve Run
--   * mcp__supabase__execute_sql ile: dosya icerigi tek sorgu olarak
--
-- ONCE YEDEK AL
-- Bu rollback bazi verileri kalici olarak siler (user_profiles.is_super_admin,
-- user_roles'taki super_admin kaydi). Rollback oncesi pg_dump zorunludur:
--   backups/pre_rollback_step05a_YYYYMMDD_HHMMSS.sql
--
-- ROLLBACK KAPSAMI
--   1. current_organization_id() fonksiyonu ESKI HALINE (SECURITY INVOKER, fallbacksiz)
--   2. user_roles tablosundan Mehmet'in super_admin kaydi DELETE
--   3. public.is_super_admin(uuid) fonksiyonu DROP
--   4. idx_user_profiles_super_admin partial index DROP
--   5. user_profiles.is_super_admin kolonu DROP (tum is_super_admin = true kayitlari kaybedilir)
-- =============================================================================

BEGIN;

SET statement_timeout = '60s';
SET lock_timeout = '10s';


-- -----------------------------------------------------------------------------
-- 1. current_organization_id() — eski haline geri yukle
-- -----------------------------------------------------------------------------
-- Kaynak: pg_get_functiondef() cikti, yedek snapshot'indan (2026-04-11 ogle)
-- Ozellikler:
--   * LANGUAGE sql (ayni)
--   * STABLE (ayni)
--   * SECURITY INVOKER (geri alindi, default)
--   * SET search_path TO '' (ayni — mevcut standart)
-- Signature ayni oldugu icin bagli 88 RLS policy etkilenmez.

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
-- SECURITY INVOKER (default) — DEFINER geri alindi
SET search_path TO ''
AS $$
  SELECT NULLIF(
    COALESCE(
      auth.jwt() ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id',
      auth.jwt() -> 'user_metadata' ->> 'organization_id'
    ),
    ''
  )::uuid;
$$;

-- Not: Orijinal fonksiyonda OWNER/GRANT ayarlari yoktu (default: postgres sahip).
-- Bu rollback Parca A'nin GRANT degisikliklerini KALDIRMAZ cunku bunlar zararli degil
-- (authenticated rolune EXECUTE vermis olmak gecerli bir guvenlik ayari).
-- Saf restore istenirse manuel olarak:
--   REVOKE EXECUTE ON FUNCTION public.current_organization_id() FROM authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. Mehmet'ten super_admin rol kaydini sil
-- -----------------------------------------------------------------------------

DELETE FROM public.user_roles ur
 USING public.user_profiles up, public.roles r
 WHERE ur.user_profile_id = up.id
   AND ur.role_id = r.id
   AND up.auth_user_id = 'f0c09ad3-c0b0-4c39-b2a1-aa1bcaf8b01d'::uuid
   AND r.code = 'super_admin';


-- -----------------------------------------------------------------------------
-- 3. is_super_admin(uuid) fonksiyonu DROP
-- -----------------------------------------------------------------------------
-- Bu fonksiyona henuz hicbir RLS policy baglanmadi (Parca A sonrasinda policy
-- guncellemesi yok). DROP guvenli, CASCADE gerekmiyor.

DROP FUNCTION IF EXISTS public.is_super_admin(uuid);


-- -----------------------------------------------------------------------------
-- 4. Partial index DROP
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_user_profiles_super_admin;


-- -----------------------------------------------------------------------------
-- 5. is_super_admin kolonu DROP
-- -----------------------------------------------------------------------------
-- DIKKAT: Bu kolonda TRUE deger ile isaretlenmis TUM kayitlar kaybedilir.
-- Migration henuz sadece Mehmet'i TRUE yapti — bu rollback o bilgiyi siler.
-- Yedek almadan calistirma.

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS is_super_admin;


-- -----------------------------------------------------------------------------
-- Rollback sonu dogrulama
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_has_column        boolean;
  v_has_fn_is_super   boolean;
  v_has_index         boolean;
  v_current_org_sec_def boolean;
  v_mehmet_role_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_super_admin'
  ) INTO v_has_column;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'is_super_admin'
  ) INTO v_has_fn_is_super;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_user_profiles_super_admin'
  ) INTO v_has_index;

  SELECT p.prosecdef INTO v_current_org_sec_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'current_organization_id'
     AND pg_get_function_arguments(p.oid) = '';

  SELECT count(*) INTO v_mehmet_role_count
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_profile_id
    JOIN public.roles r ON r.id = ur.role_id
   WHERE up.auth_user_id = 'f0c09ad3-c0b0-4c39-b2a1-aa1bcaf8b01d'::uuid
     AND r.code = 'super_admin';

  RAISE NOTICE '=== Rollback Dogrulama ===';
  RAISE NOTICE 'user_profiles.is_super_admin kolonu var mi (beklenen f): %', v_has_column;
  RAISE NOTICE 'public.is_super_admin() fonksiyonu var mi (beklenen f): %', v_has_fn_is_super;
  RAISE NOTICE 'idx_user_profiles_super_admin var mi (beklenen f): %', v_has_index;
  RAISE NOTICE 'current_organization_id() SECURITY DEFINER (beklenen f): %', v_current_org_sec_def;
  RAISE NOTICE 'Mehmet''te super_admin rol sayisi (beklenen 0): %', v_mehmet_role_count;

  IF v_has_column THEN
    RAISE EXCEPTION 'Rollback eksik: user_profiles.is_super_admin kolonu hala mevcut';
  END IF;

  IF v_has_fn_is_super THEN
    RAISE EXCEPTION 'Rollback eksik: public.is_super_admin() fonksiyonu hala mevcut';
  END IF;

  IF v_has_index THEN
    RAISE EXCEPTION 'Rollback eksik: idx_user_profiles_super_admin hala mevcut';
  END IF;

  IF v_current_org_sec_def THEN
    RAISE EXCEPTION 'Rollback eksik: current_organization_id() hala SECURITY DEFINER';
  END IF;

  IF v_mehmet_role_count <> 0 THEN
    RAISE EXCEPTION 'Rollback eksik: Mehmet''in super_admin rol kaydi hala var (sayi: %)', v_mehmet_role_count;
  END IF;

  RAISE NOTICE '=== Rollback basariyla dogrulandi — Parca A tamamen geri alindi ===';
END $$;

COMMIT;

-- EOF
