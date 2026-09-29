#!/usr/bin/env bash
# PM2 üzerinde birden fazla nakliyeborsasi API süreci uyarısı.
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "SKIP: pm2 yüklü değil"
  exit 0
fi

mapfile -t lines < <(pm2 jlist 2>/dev/null | python3 -c "
import json,sys
try:
  procs=json.load(sys.stdin)
except Exception:
  sys.exit(0)
names=[]
for p in procs:
  n=(p.get('name') or '').lower()
  if 'api' in n and ('nakliye' in n or 'lerta' in n or n.endswith('-api') or n=='api'):
    names.append(p.get('name','?'))
for x in names:
  print(x)
" 2>/dev/null || true)

count="${#lines[@]}"
if [[ "${count}" -le 1 ]]; then
  echo "OK: PM2 API süreç sayısı=${count}"
  exit 0
fi

echo "NOT: Birden fazla PM2 API süreci (${count}) — çift dinleme / bellek riski:" >&2
printf '  - %s\n' "${lines[@]}" >&2
echo "İpucu: pm2 list · gereksiz süreci pm2 delete <id>" >&2
exit 0
