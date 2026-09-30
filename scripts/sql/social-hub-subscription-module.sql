-- SOCIAL_HUB modülünü lojistik Professional / Enterprise planlarına ekle (prod idempotent)

UPDATE subscription_plans
SET "includedModuleCodes" = "includedModuleCodes" || '["SOCIAL_HUB"]'::jsonb
WHERE "planCode" IN ('carrier_professional_tr_ua', 'forwarder_enterprise_tr_ua')
  AND NOT ("includedModuleCodes" ? 'SOCIAL_HUB');
