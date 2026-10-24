# npm audit — kritik kalemler ve plan

**Son koşu:** 4 critical, 12 high (çoğu `@nestjs/cli` → `webpack` transitive).

## Önerilen adımlar

1. **Çeyreklik CI:** `SKIP_NPM_AUDIT=0 bash scripts/verify-security-compliance-mp9.sh`
2. **Nest CLI major:** `@nestjs/cli@12` yükseltmesi — ayrı sprint, `nest build` doğrulaması
3. **Üretim runtime:** API container yalnızca `dist/` + prod `node_modules` (devDependencies yok) — webpack SSRF riski build-time
4. **Risk kaydı:** MP-9 due diligence paketine audit çıktısı eklenir

```bash
npm audit --json > docs/reports/npm-audit-$(date +%F).json
```
