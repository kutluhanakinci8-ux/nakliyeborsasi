#!/usr/bin/env bash
# JWT ile excellence demo içeriğini ve temel API yüzeyini doğrular.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT}/scripts/resolve-messaging-test-jwt.sh" || true

MARKER="[DEMO_EXCELLENCE_V1]"
SEARCH_TOKEN="DEMO_EXCELLENCE_ARAMA_TOKEN"
EXCELLENCE_SHOWCASE_THREAD_ID="${EXCELLENCE_SHOWCASE_THREAD_ID:-}"

echo "== Firma sohbeti excellence showcase verify =="

for phase in fs1 fs2 fs3 fs4 fs5 fs6 fs7 fs8 fs9 fs10 fs11 fs12; do
  script="${ROOT}/scripts/verify-firma-sohbeti-${phase}.sh"
  if [[ -x "${script}" ]]; then
    echo ""
    echo "-- ${phase} --"
    API_BASE="${API_BASE}" bash "${script}" || {
      echo "FAIL: ${phase}"
      exit 1
    }
  fi
done

JWT="${MESSAGING_TEST_JWT:-${MESSAGING_SSE_JWT:-}}"
if [[ -z "${JWT}" ]]; then
  echo ""
  echo "SKIP: showcase içerik doğrulaması (MESSAGING_TEST_EMAIL/PASSWORD veya JWT gerekli)"
  echo "Excellence showcase verify: PASS (status only)"
  exit 0
fi

auth_hdr=(-H "Authorization: Bearer ${JWT}")

echo ""
echo "== FS-8 companies/search =="
curl -fsS "${auth_hdr[@]}" \
  "${API_BASE}/messaging/companies/search?q=test&limit=5&lang=tr" \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
companies = d.get('companies') or []
if not companies:
    raise SystemExit('FAIL: company search boş')
print('OK: company search', len(companies), 'sonuç')
"

echo ""
echo "== FS-8 hub-default =="
curl -fsS "${auth_hdr[@]}" "${API_BASE}/messaging/hub-default?lang=tr" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('defaultTab') in ('chat','email'); print('OK: hub-default', d['defaultTab'])"

echo ""
echo "== Mesaj arama (FS-2/10) =="
curl -fsS "${auth_hdr[@]}" \
  "${API_BASE}/messaging/search?q=${SEARCH_TOKEN}&limit=10&lang=tr" \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
results = d.get('results') or []
if not any(
    '${SEARCH_TOKEN}' in (r.get('snippet') or r.get('bodyPreview') or r.get('bodyText') or '')
    for r in results
):
    raise SystemExit('FAIL: arama token bulunamadı — seed çalıştırın')
print('OK: message search hit', len(results))
"

echo ""
echo "== Showcase thread içerik =="
threads_json="$(curl -fsS "${auth_hdr[@]}" "${API_BASE}/messaging/threads?lang=tr")"
search_json="$(curl -fsS "${auth_hdr[@]}" \
  "${API_BASE}/messaging/search?q=${SEARCH_TOKEN}&limit=3&lang=tr")"
if [[ -n "${EXCELLENCE_SHOWCASE_THREAD_ID}" ]]; then
  thread_id="${EXCELLENCE_SHOWCASE_THREAD_ID}"
else
  thread_id="$(THREADS_JSON="${threads_json}" SEARCH_JSON="${search_json}" MARKER="${MARKER}" python3 - <<'PY'
import json, os
marker = os.environ["MARKER"]
threads = json.loads(os.environ["THREADS_JSON"])
search = json.loads(os.environ["SEARCH_JSON"])
by_id = {t.get("threadId"): t for t in threads.get("threads") or [] if t.get("threadId")}
for r in search.get("results") or []:
    tid = r.get("threadId")
    if not tid:
        continue
    meta = by_id.get(tid) or {}
    if meta.get("threadKind") == "group":
        continue
    print(tid)
    raise SystemExit(0)
for t in threads.get("threads") or []:
    if t.get("threadKind") == "group":
        continue
    prev = t.get("lastMessagePreview") or ""
    if marker in prev:
        print(t.get("threadId") or "")
        break
PY
)"
fi

if [[ -z "${thread_id}" ]]; then
  echo "FAIL: showcase thread bulunamadı — bash scripts/seed-firma-sohbeti-excellence-showcase.sh"
  exit 1
fi

messages_json="$(curl -fsS "${auth_hdr[@]}" \
  "${API_BASE}/messaging/threads/${thread_id}/messages?lang=tr")"
MESSAGES_JSON="${messages_json}" MARKER="${MARKER}" python3 - <<'PY'
import json, os, sys
marker = os.environ.get("MARKER", "")
data = json.loads(os.environ["MESSAGES_JSON"])
messages = data.get("messages") or []
if not messages:
    raise SystemExit("FAIL: mesaj listesi boş")

has_internal = any(m.get("messageKind") == "internal" for m in messages)
has_attachment = any(m.get("attachments") for m in messages)
has_mention = any(m.get("mentionUserIds") for m in messages)
has_edited = any(m.get("editedAt") for m in messages)
has_deleted = any(m.get("deleted") for m in messages)
has_stamp = any(m.get("operationStamps") for m in messages)
has_read_field = all("readByCounterpartyReaders" in m for m in messages)

checks = [
    ("internal note", has_internal),
    ("attachment", has_attachment),
    ("mention", has_mention),
    ("edited", has_edited),
    ("deleted", has_deleted),
    ("operation stamp", has_stamp),
    ("read receipts field", has_read_field),
]
failed = [name for name, ok in checks if not ok]
if failed:
    has_marker = any(marker in (m.get("bodyText") or "") for m in messages)
    print(f"DIAG: thread mesaj sayısı={len(messages)} marker_in_body={has_marker}", file=sys.stderr)
    if not has_marker:
        print(
            "İpucu: API_BASE + MESSAGING_TEST_EMAIL=yukveren01@test.nakliyeborsasi.local ile seed çalıştırın",
            file=sys.stderr,
        )
        print(
            "  bash scripts/seed-firma-sohbeti-excellence-showcase.sh",
            file=sys.stderr,
        )
        print(
            "  FORCE_EXCELLENCE_DEMO=1 bash scripts/seed-firma-sohbeti-excellence-showcase.sh",
            file=sys.stderr,
        )
    raise SystemExit(f"FAIL: eksik showcase özellikleri: {failed}")
print("OK: showcase messages", len(messages), "—", ", ".join(n for n, _ in checks))
PY

echo ""
echo "== Grup thread =="
group_id="$(THREADS_JSON="${threads_json}" MARKER="${MARKER}" python3 - <<'PY'
import json, os
marker = os.environ["MARKER"]
data = json.loads(os.environ["THREADS_JSON"])
for t in data.get("threads") or []:
    if t.get("threadKind") == "group" and marker in (t.get("title") or ""):
        print(t.get("threadId") or "")
        break
PY
)"
if [[ -z "${group_id}" ]]; then
  echo "FAIL: grup thread yok"
  exit 1
fi
curl -fsS "${auth_hdr[@]}" \
  "${API_BASE}/messaging/threads/${group_id}/messages?lang=tr" \
  | python3 -c "import json,sys; m=json.load(sys.stdin).get('messages') or []; assert len(m)>=2; print('OK: group messages', len(m))"

echo ""
echo "== Org quick replies (FS-11) =="
curl -fsS "${auth_hdr[@]}" "${API_BASE}/messaging/quick-replies/org?lang=tr" \
  | python3 -c "
import json,sys
t=json.load(sys.stdin).get('templates') or []
if len(t) < 1:
    raise SystemExit('FAIL: org quick reply yok')
print('OK: org templates', len(t))
"

echo ""
echo "== Typing endpoint =="
curl -fsS -X POST "${auth_hdr[@]}" \
  "${API_BASE}/messaging/threads/${thread_id}/typing?lang=tr" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('ok') is True; print('OK: typing')"

echo ""
echo "Excellence showcase verify: PASS"
