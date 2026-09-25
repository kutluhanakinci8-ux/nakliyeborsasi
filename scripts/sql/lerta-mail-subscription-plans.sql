INSERT INTO subscription_plans (
  "planCode",
  "tierCode",
  "includedModuleCodes",
  "maxConcurrentSearchTabs",
  "laneAnalyticsHistoryDays"
) VALUES
  (
    'lerta_mail_pilot_tr',
    'STARTER',
    '["LERTA_MAIL"]'::jsonb,
    0,
    0
  ),
  (
    'lerta_mail_corporate_tr',
    'PROFESSIONAL',
    '["LERTA_MAIL"]'::jsonb,
    0,
    0
  ),
  (
    'lerta_mail_enterprise_tr',
    'ENTERPRISE',
    '["LERTA_MAIL"]'::jsonb,
    0,
    0
  )
ON CONFLICT ("planCode") DO UPDATE SET
  "tierCode" = EXCLUDED."tierCode",
  "includedModuleCodes" = EXCLUDED."includedModuleCodes",
  "maxConcurrentSearchTabs" = EXCLUDED."maxConcurrentSearchTabs",
  "laneAnalyticsHistoryDays" = EXCLUDED."laneAnalyticsHistoryDays";
