-- Odaklanmış/Diğer: ürün varsayılanı açık (eski SA4 false default düzeltmesi)
ALTER TABLE mail_inbox_preferences
  ALTER COLUMN "focusedInboxEnabled" SET DEFAULT true;

UPDATE mail_inbox_preferences
SET "focusedInboxEnabled" = true
WHERE "focusedInboxEnabled" = false;
