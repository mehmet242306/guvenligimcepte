begin;

update public.subscription_plans
   set message_limit = 40,
       analysis_limit = 15,
       document_limit = 3,
       action_limits = '{
         "nova_message": 40,
         "ai_analysis": 15,
         "document_generation": 3,
         "risk_analysis": 4,
         "field_inspection": 4,
         "incident_analysis": 1,
         "training_slide": 0,
         "export": 4
       }'::jsonb,
       updated_at = now()
 where plan_key = 'basic';

update public.subscription_plans
   set message_limit = 100,
       analysis_limit = 40,
       document_limit = 8,
       action_limits = '{
         "nova_message": 100,
         "ai_analysis": 40,
         "document_generation": 8,
         "risk_analysis": 10,
         "field_inspection": 10,
         "incident_analysis": 2,
         "training_slide": 0,
         "export": 10
       }'::jsonb,
       updated_at = now()
 where plan_key = 'starter';

update public.subscription_plans
   set message_limit = 240,
       analysis_limit = 80,
       document_limit = 15,
       action_limits = '{
         "nova_message": 240,
         "ai_analysis": 80,
         "document_generation": 15,
         "risk_analysis": 20,
         "field_inspection": 20,
         "incident_analysis": 6,
         "training_slide": 1,
         "export": 20
       }'::jsonb,
       updated_at = now()
 where plan_key = 'plus';

update public.subscription_plans
   set message_limit = 400,
       analysis_limit = 120,
       document_limit = 20,
       action_limits = '{
         "nova_message": 400,
         "ai_analysis": 120,
         "document_generation": 20,
         "risk_analysis": 35,
         "field_inspection": 35,
         "incident_analysis": 10,
         "training_slide": 2,
         "export": 35
       }'::jsonb,
       updated_at = now()
 where plan_key = 'professional';

commit;
