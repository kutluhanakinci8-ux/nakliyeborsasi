SELECT c.id,
       c."legalName",
       u."emailAddress"
FROM companies c
JOIN company_memberships m ON m."companyId" = c.id
JOIN user_accounts u ON u.id = m."userId"
WHERE m."roleCode" = 'COMPANY_OWNER'
ORDER BY c."createdAt";
