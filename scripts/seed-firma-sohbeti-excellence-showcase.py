#!/usr/bin/env python3
"""
Firma sohbeti FS-1…12 özellik kontrolü için zengin demo mesajları + API aksiyonları.
İşaretçi: [DEMO_EXCELLENCE_V1]

Kullanım:
  API_BASE=https://app.lerta.com.tr/api/v1 bash scripts/seed-firma-sohbeti-excellence-showcase.sh
  FORCE_EXCELLENCE_DEMO=1  # idempotent atlama
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

MARKER = "[DEMO_EXCELLENCE_V1]"
SEARCH_TOKEN = "DEMO_EXCELLENCE_ARAMA_TOKEN"
API_BASE = os.environ.get("API_BASE", "https://app.lerta.com.tr/api/v1").rstrip("/")
PASSWORD = os.environ.get("TEST_MARKET_PASSWORD", "TestPass123!")

SHIPPER = "yukveren01@test.nakliyeborsasi.local"
CARRIER_A = "yuktasiyan01@test.nakliyeborsasi.local"
CARRIER_B = "yuktasiyan02@test.nakliyeborsasi.local"
SHIPPER_B = "yukveren02@test.nakliyeborsasi.local"

TINY_PDF_B64 = (
    "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL9BhZ3RlL1BhcmVudCAyIDAgUi9NZWRp"
    "YVswIDAgMjAwIDUwXS9Db250ZW50cyAzIDAgUj4+CmVuZG9iago="
)


def api(method: str, path: str, token: str | None = None, body: dict | None = None) -> dict:
    url = f"{API_BASE}{path}"
    data = None
    headers = {"Accept": "application/json", "Accept-Language": "tr"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} → HTTP {e.code}: {detail[:800]}") from e


def login(email: str) -> str:
    out = api("POST", "/auth/login", body={"emailAddress": email, "password": PASSWORD})
    token = out.get("accessToken")
    if not token:
        raise RuntimeError(f"{email}: accessToken yok")
    return token


def jwt_company_id(token: str) -> str:
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    data = json.loads(base64.urlsafe_b64decode(payload))
    cid = data.get("companyId")
    if not cid:
        raise RuntimeError("JWT companyId yok")
    return cid


def showcase_thread_complete(token: str, thread_id: str) -> bool:
    messages = (
        api("GET", f"/messaging/threads/{thread_id}/messages?lang=tr", token=token).get(
            "messages"
        )
        or []
    )
    if not messages:
        return False
    has_token = any(SEARCH_TOKEN in (m.get("bodyText") or "") for m in messages)
    has_internal = any(m.get("messageKind") == "internal" for m in messages)
    has_attachment = any(m.get("attachments") for m in messages)
    return has_token and has_internal and has_attachment


def already_seeded(token: str) -> bool:
    search = api(
        "GET",
        f"/messaging/search?q={SEARCH_TOKEN}&limit=8&lang=tr",
        token=token,
    )
    threads = api("GET", "/messaging/threads?lang=tr", token=token).get("threads") or []
    group_titles_only = any(
        (t.get("title") or "").find(MARKER) >= 0 and t.get("threadKind") == "group"
        for t in threads
    )
    for r in search.get("results") or []:
        tid = r.get("threadId")
        if not tid:
            continue
        meta = next((t for t in threads if t.get("threadId") == tid), {})
        if meta.get("threadKind") == "group":
            continue
        if showcase_thread_complete(token, tid):
            return True
    if group_titles_only:
        return False
    for t in threads:
        prev = t.get("lastMessagePreview") or ""
        if SEARCH_TOKEN in prev and t.get("threadKind") != "group":
            tid = t.get("threadId")
            if tid and showcase_thread_complete(token, tid):
                return True
    return False


def open_thread(token: str, counterparty_id: str, listing_id: str | None = None) -> str:
    body: dict = {"counterpartyCompanyId": counterparty_id}
    if listing_id:
        body["freightListingId"] = listing_id
    thread = api("POST", "/messaging/threads?lang=tr", token=token, body=body).get("thread") or {}
    tid = thread.get("id") or thread.get("threadId")
    if not tid:
        raise RuntimeError(f"thread id alınamadı: {thread}")
    return tid


def send(
    token: str,
    thread_id: str,
    text: str,
    *,
    kind: str = "public",
    attachments: list | None = None,
) -> dict:
    body: dict = {"bodyText": text}
    if kind == "internal":
        body["messageKind"] = "internal"
    if attachments:
        body["attachments"] = attachments
    out = api(
        "POST",
        f"/messaging/threads/{thread_id}/messages?lang=tr",
        token=token,
        body=body,
    )
    time.sleep(0.12)
    return out.get("message") or {}


def find_listing_id(ship_tok: str, car_co: str) -> str | None:
    threads = api("GET", "/messaging/threads?lang=tr", token=ship_tok).get("threads") or []
    for t in threads:
        if t.get("counterpartyCompanyId") == car_co and t.get("freightListingId"):
            return t["freightListingId"]
    return None


def seed_showcase_thread(ship_tok: str, car_tok: str, ship_co: str, car_co: str) -> str:
    listing_id = find_listing_id(ship_tok, car_co)
    tid = open_thread(ship_tok, car_co, listing_id)

    send(
        ship_tok,
        tid,
        f"""{MARKER} **Firma sohbeti özellik turu**

Bu thread ile UI'da şunları kontrol edin:
- **FS-8:** Firma araması, hub varsayılanı (Profil → Mesajlar)
- **FS-9:** Okundu (✓✓), düzenle/sil, @mention, iç not filtresi
- **FS-10:** Markdown, gün ayırıcı, ek (PDF), alıntılı yanıt (> satırları), ilan pin şeridi
- **FS-11:** Operasyon damgası (Onaylandı), org şablonları, klavye kısayolları
- **FS-12:** Grup sohbeti (ayrı thread), kanal ayarları paneli

Arama testi: `{SEARCH_TOKEN}`""",
    )

    send(
        car_tok,
        tid,
        "**Markdown:** *italik*, `kod`, liste:\n- rota onaylı\n- fiyat görüşülüyor\n- ETA 4 gün",
    )

    send(
        ship_tok,
        tid,
        "İç not: müşteri 45 gün vade istiyor — finans onayı bekleniyor.",
        kind="internal",
    )

    colleagues = api("GET", "/messaging/colleagues?lang=tr", token=ship_tok).get("colleagues") or []
    mention_line = "Ekip bilgilendirme: lütfen teklifi kontrol edin."
    if colleagues:
        uid = colleagues[0].get("userId") or colleagues[0].get("id")
        if uid:
            mention_line = f"@{{{uid}}} teklif PDF'ini kontrol eder misin? (mention testi)"

    msg_with_attach = send(
        ship_tok,
        tid,
        mention_line,
        attachments=[
            {
                "filename": "excellence-teklif.pdf",
                "contentType": "application/pdf",
                "contentBase64": TINY_PDF_B64,
            }
        ],
    )
    attach_msg_id = msg_with_attach.get("id")

    send(car_tok, tid, "> Önceki mesaj alıntısı (quote reply formatı)\n\nEvet, rampa 7 — yarın 09:00.")

    edit_target = send(ship_tok, tid, "Bu mesaj düzenlenecek (eski metin).")
    edit_id = edit_target.get("id")
    if edit_id:
        api(
            "PATCH",
            f"/messaging/threads/{tid}/messages/{edit_id}?lang=tr",
            token=ship_tok,
            body={"bodyText": "Bu mesaj **düzenlendi** — FS-9 edit modal testi."},
        )

    stamp_target_id = attach_msg_id or edit_id
    if stamp_target_id:
        api(
            "POST",
            f"/messaging/threads/{tid}/messages/{stamp_target_id}/stamp?lang=tr",
            token=car_tok,
            body={"stampType": "approved"},
        )

    del_msg = send(ship_tok, tid, "Silinecek geçici mesaj (FS-9 delete).")
    del_id = del_msg.get("id")
    if del_id:
        api("DELETE", f"/messaging/threads/{tid}/messages/{del_id}?lang=tr", token=ship_tok)

    api("POST", f"/messaging/threads/{tid}/typing?lang=tr", token=car_tok, body={})

    car_tok_read = car_tok
    api("GET", f"/messaging/threads/{tid}/messages?lang=tr", token=car_tok_read)

    send(
        car_tok,
        tid,
        "Son mesaj: okundu bilgisi ve damga satırını kontrol edin. Sabit fiyat için ilan pin şeridinden **Kabul** deneyin.",
    )

    return tid


def seed_group_thread(ship_tok: str, car_a_co: str, car_b_co: str) -> str:
    body = {
        "title": f"{MARKER} Ortak operasyon grubu",
        "participantCompanyIds": [car_a_co, car_b_co],
        "participantRoles": {
            car_a_co: "carrier",
            car_b_co: "carrier",
        },
    }
    thread = api("POST", "/messaging/threads/group?lang=tr", token=ship_tok, body=body).get(
        "thread"
    ) or {}
    tid = thread.get("id") or thread.get("threadId")
    if not tid:
        raise RuntimeError(f"group thread id alınamadı: {thread}")

    send(ship_tok, tid, f"{MARKER} Grup sohbeti — FS-7/FS-12: katılımcı rolleri ve grup başlığı.")
    send(
        login(CARRIER_A),
        tid,
        "Nakliyeci A: kapasite 22t frigo, çıkış İstanbul.",
    )
    send(
        login(CARRIER_B),
        tid,
        "Nakliyeci B: yedek araç Ankara'da — acil yük için hazır.",
    )
    return tid


def seed_org_quick_reply_template(ship_tok: str) -> None:
    templates = [
        {
            "id": "demo-excellence-1",
            "labelTr": "Excellence: teklif gönderildi",
            "bodyText": "Teklifimizi ilettik, onayınızı bekliyoruz.",
        },
        {
            "id": "demo-excellence-2",
            "labelTr": "Excellence: yükleme saati",
            "bodyText": "Yükleme penceresi: 09:00–12:00, rampa no paylaşılacak.",
        },
    ]
    api("PUT", "/messaging/quick-replies/org?lang=tr", token=ship_tok, body={"templates": templates})


def main() -> int:
    print(f"API: {API_BASE}")
    ship_tok = login(SHIPPER)
    if already_seeded(ship_tok) and os.environ.get("FORCE_EXCELLENCE_DEMO") != "1":
        print(f"SKIP: {MARKER} zaten var — FORCE_EXCELLENCE_DEMO=1 ile yeniden oluştur")
        return 0

    car_a_tok = login(CARRIER_A)
    car_b_co = jwt_company_id(login(CARRIER_B))
    car_a_co = jwt_company_id(car_a_tok)
    ship_co = jwt_company_id(ship_tok)

    print("== 1:1 showcase thread ==")
    tid_1 = seed_showcase_thread(ship_tok, car_a_tok, ship_co, car_a_co)
    print(f"OK threadId={tid_1}")

    print("== Grup thread ==")
    tid_g = seed_group_thread(ship_tok, car_a_co, car_b_co)
    print(f"OK groupThreadId={tid_g}")

    print("== Org quick reply şablonları ==")
    seed_org_quick_reply_template(ship_tok)
    print("OK org templates")

    print("")
    print("=== Excellence demo hazır ===")
    print(f"Giriş: {SHIPPER} / {CARRIER_A} (şifre: {PASSWORD})")
    print("UI: /messaging?tab=sohbet")
    print(f"1:1 thread: {tid_1}")
    print(f"Grup thread: {tid_g}")
    print(f"Arama: {SEARCH_TOKEN}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"HATA: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
