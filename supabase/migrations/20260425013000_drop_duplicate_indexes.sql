-- 72 duplicate non-PK indexes detected via pg_index analysis (advisor lint
-- "duplicate_index"). Each pair has the same column list + opclass; Postgres
-- only uses one but pays write-amplification on all of them. We drop the
-- shorter/older name from each pair and keep the full, descriptive
-- `idx_<table>_<column>` form.
--
-- Safe operation: dropping a non-PK index is a metadata change with a brief
-- AccessExclusiveLock; the surviving index serves the same queries.

BEGIN;

DROP INDEX IF EXISTS public.idx_agent_tool_calls_created;
DROP INDEX IF EXISTS public.idx_ai_learning_org;
DROP INDEX IF EXISTS public.idx_ai_search_queries_created;
DROP INDEX IF EXISTS public.idx_ai_interactions_created;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at_desc;
DROP INDEX IF EXISTS public.idx_audit_logs_org_id;
DROP INDEX IF EXISTS public.idx_certificates_org;
DROP INDEX IF EXISTS public.idx_cdv_organization_id;
DROP INDEX IF EXISTS public.idx_cd_organization_id;
DROP INDEX IF EXISTS public.idx_cd_status;
DROP INDEX IF EXISTS public.idx_company_memberships_workspace_id;
DROP INDEX IF EXISTS public.idx_company_training_attendees_workspace_id;
DROP INDEX IF EXISTS public.idx_digital_twin_models_workspace_id;
DROP INDEX IF EXISTS public.idx_digital_twin_models_org_id;
DROP INDEX IF EXISTS public.idx_digital_twin_points_workspace_id;
DROP INDEX IF EXISTS public.idx_digital_twin_points_org_id;
DROP INDEX IF EXISTS public.idx_document_templates_org;
DROP INDEX IF EXISTS public.idx_editor_documents_workspace;
DROP INDEX IF EXISTS public.idx_editor_documents_org;
DROP INDEX IF EXISTS public.idx_incident_dof_workspace_id;
DROP INDEX IF EXISTS public.idx_dof_org;
DROP INDEX IF EXISTS public.idx_dof_status;
DROP INDEX IF EXISTS public.idx_incident_ishikawa_workspace_id;
DROP INDEX IF EXISTS public.idx_incident_personnel_workspace_id;
DROP INDEX IF EXISTS public.idx_incident_witnesses_workspace_id;
DROP INDEX IF EXISTS public.idx_incidents_company;
DROP INDEX IF EXISTS public.idx_incidents_org;
DROP INDEX IF EXISTS public.idx_isg_tasks_workspace_id;
DROP INDEX IF EXISTS public.idx_isg_tasks_org_id;
DROP INDEX IF EXISTS public.idx_mevzuat_docs_status;
DROP INDEX IF EXISTS public.idx_notifications_org_id;
DROP INDEX IF EXISTS public.idx_pd_company_identity_id;
DROP INDEX IF EXISTS public.idx_personnel_documents_workspace_id;
DROP INDEX IF EXISTS public.idx_pd_organization_id;
DROP INDEX IF EXISTS public.idx_pd_personnel_id;
DROP INDEX IF EXISTS public.idx_phe_company_identity_id;
DROP INDEX IF EXISTS public.idx_personnel_health_exams_workspace_id;
DROP INDEX IF EXISTS public.idx_phe_organization_id;
DROP INDEX IF EXISTS public.idx_phe_personnel_id;
DROP INDEX IF EXISTS public.idx_ppe_company_identity_id;
DROP INDEX IF EXISTS public.idx_personnel_ppe_records_workspace_id;
DROP INDEX IF EXISTS public.idx_ppe_organization_id;
DROP INDEX IF EXISTS public.idx_ppe_personnel_id;
DROP INDEX IF EXISTS public.idx_ppe_status;
DROP INDEX IF EXISTS public.idx_psp_company_identity_id;
DROP INDEX IF EXISTS public.idx_personnel_special_policies_workspace_id;
DROP INDEX IF EXISTS public.idx_psp_organization_id;
DROP INDEX IF EXISTS public.idx_psp_personnel_id;
DROP INDEX IF EXISTS public.idx_pt_company_identity_id;
DROP INDEX IF EXISTS public.idx_personnel_trainings_workspace_id;
DROP INDEX IF EXISTS public.idx_pt_organization_id;
DROP INDEX IF EXISTS public.idx_pt_personnel_id;
DROP INDEX IF EXISTS public.idx_pt_status;
DROP INDEX IF EXISTS public.idx_risk_assessment_findings_workspace_id;
DROP INDEX IF EXISTS public.idx_risk_assessment_images_workspace_id;
DROP INDEX IF EXISTS public.idx_risk_assessment_items_workspace_id;
DROP INDEX IF EXISTS public.idx_risk_assessment_rows_workspace_id;
DROP INDEX IF EXISTS public.idx_risk_categories_org;
DROP INDEX IF EXISTS public.idx_scan_detections_workspace_id;
DROP INDEX IF EXISTS public.idx_scan_detections_org_id;
DROP INDEX IF EXISTS public.idx_scan_frames_workspace_id;
DROP INDEX IF EXISTS public.idx_scan_frames_org_id;
DROP INDEX IF EXISTS public.idx_scan_sessions_workspace_id;
DROP INDEX IF EXISTS public.idx_scan_sessions_org_id;
DROP INDEX IF EXISTS public.idx_slide_media_assets_org;
DROP INDEX IF EXISTS public.idx_surveys_org;
DROP INDEX IF EXISTS public.team_members_workspace_idx;
DROP INDEX IF EXISTS public.idx_ts_entries_company;
DROP INDEX IF EXISTS public.idx_timesheets_org;
DROP INDEX IF EXISTS public.idx_user_profiles_org_id;
DROP INDEX IF EXISTS public.idx_vision_logs_status;
DROP INDEX IF EXISTS public.workspace_invitations_workspace_idx;

COMMIT;
