#!/usr/bin/env python3
"""
Firma sohbeti UI testi: 5 yük veren ↔ taşıyıcı thread, zengin mesaj geçmişi.
Idempotent — [DEMO_UI_PACK_V1] işaretçisi varsa atlar.

Kullanım:
  API_BASE=https://app.lerta.com.tr/api/v1 python3 scripts/seed-firma-sohbeti-demo-conversations.py
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

MARKER = "[DEMO_UI_PACK_V1]"
API_BASE = os.environ.get("API_BASE", "https://app.lerta.com.tr/api/v1").rstrip("/")
PASSWORD = os.environ.get("TEST_MARKET_PASSWORD", "TestPass123!")

PAIRS = [
    ("yukveren01@test.nakliyeborsasi.local", "yuktasiyan01@test.nakliyeborsasi.local"),
    ("yukveren02@test.nakliyeborsasi.local", "yuktasiyan02@test.nakliyeborsasi.local"),
    ("yukveren03@test.nakliyeborsasi.local", "yuktasiyan03@test.nakliyeborsasi.local"),
    ("yukveren04@test.nakliyeborsasi.local", "yuktasiyan04@test.nakliyeborsasi.local"),
    ("yukveren05@test.nakliyeborsasi.local", "yuktasiyan05@test.nakliyeborsasi.local"),
]

# Minimal geçerli PDF (boş sayfa)
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} → HTTP {e.code}: {detail[:500]}") from e


def login(email: str) -> str:
    out = api("POST", "/auth/login", body={"emailAddress": email, "password": PASSWORD})
    if out.get("requiresTotp"):
        raise RuntimeError(f"{email}: TOTP açık — test hesabında kapatın")
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


def already_seeded() -> bool:
    """İşaretçi mesaj var mı (ilk thread mesaj listesi)."""
    token = login(PAIRS[0][0])
    threads = api("GET", "/messaging/threads?lang=tr", token=token).get("threads") or []
    for t in threads:
        if MARKER in (t.get("lastMessagePreview") or ""):
            return True
        tid = t.get("threadId")
        if not tid:
            continue
        try:
            msgs = api("GET", f"/messaging/threads/{tid}/messages?lang=tr", token=token).get(
                "messages"
            ) or []
        except RuntimeError:
            continue
        for m in msgs:
            if MARKER in (m.get("bodyText") or ""):
                return True
    return False


def open_thread(token: str, counterparty_id: str, listing_id: str | None) -> str:
    body = {"counterpartyCompanyId": counterparty_id}
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
) -> None:
    body: dict = {"bodyText": text}
    if kind == "internal":
        body["messageKind"] = "internal"
    if attachments:
        body["attachments"] = attachments
    api("POST", f"/messaging/threads/{thread_id}/messages?lang=tr", token=token, body=body)
    time.sleep(0.15)


def list_messages(token: str, thread_id: str) -> None:
    api("GET", f"/messaging/threads/{thread_id}/messages?lang=tr", token=token)


def seed_pair(index: int, shipper_email: str, carrier_email: str) -> str:
    ship_tok = login(shipper_email)
    car_tok = login(carrier_email)
    ship_co = jwt_company_id(ship_tok)
    car_co = jwt_company_id(car_tok)

    threads = api("GET", "/messaging/threads?lang=tr", token=ship_tok).get("threads") or []
    listing_id = None
    for t in threads:
        if t.get("counterpartyCompanyId") == car_co and t.get("freightListingId"):
            listing_id = t["freightListingId"]
            break

    tid = open_thread(ship_tok, car_co, listing_id)

    if index == 1:
        send(
            ship_tok,
            tid,
            f"Merhaba, {MARKER} İstanbul → Berlin frigo 22t — yükleme 3 Ekim. Kapasite var mı?",
        )
        send(car_tok, tid, "**Teklif:** 1.850 EUR (boşaltma dahil). **Tahmini süre:** 4 gün.")
        send(ship_tok, tid, "CIF ve sigorta detayını paylaşır mısınız? Onay için yönetime sunacağım.")
        send(
            car_tok,
            tid,
            "Sigorta poliçe no ve CIF şartları ektedir.",
            attachments=[
                {
                    "filename": "teklif-ozet.pdf",
                    "contentType": "application/pdf",
                    "contentBase64": TINY_PDF_B64,
                }
            ],
        )
        send(ship_tok, tid, "Teşekkürler — yarın 09:00 yükleme penceresi uygun mu?")

    elif index == 2:
        send(ship_tok, tid, f"{MARKER} Ege çıkışlı tekstil yükü — 18t, ADR değil.")
        send(car_tok, tid, "Araç İzmir'de boşalıyor, perşembe çıkış yapabiliriz.")
        send(ship_tok, tid, "Perşembe 14:00 için slot ayırtıyorum.")
        send(car_tok, tid, "Onaylandı, plaka ve şoför bilgisini yarın iletirim.")
        list_messages(ship_tok, tid)
        send(car_tok, tid, "Güncelleme: rampa numarası 7 olacak — lütfen depoyu bilgilendirin.")
        send(car_tok, tid, "Ek: yükleme için forklift şart (okunmamış test mesajı #2).")

    elif index == 3:
        send(ship_tok, tid, f"Merhaba, {MARKER} otomotiv yan sanayi paletli sevkiyat.")
        send(
            ship_tok,
            tid,
            "İç not: Müşteri ödeme vadesi 45 gün istiyor — onay bekliyoruz.",
            kind="internal",
        )
        send(car_tok, tid, "Standart vade 30 gün; 45 için %2 finansman eklenir.")
        send(ship_tok, tid, "Anlaşıldı, teklif formunu güncelliyorum.")

    elif index == 4:
        send(
            car_tok,
            tid,
            f"{MARKER} We can pick up at Constanta tomorrow 08:00 — 24t grain in bulk.",
        )
        send(ship_tok, tid, "TR: Liman çıkış belgelerini ve tonaj tartım fişini paylaşır mısınız?")
        send(car_tok, tid, "Documents will follow by email; CMR draft attached in next message.")
        send(ship_tok, tid, "Tamam — **markdown** test: - rota onaylı - fiyat bekleniyor")

    else:
        send(
            ship_tok,
            tid,
            f"{MARKER} İç Anadolu tarım kooperatifi — 26t mısır, silo çıkışı.",
        )
        send(car_tok, tid, "Boş kamyon Konya'da; CIF Ankara depo teklifimiz 42.000 TRY.")
        send(ship_tok, tid, "Fiyat uygun; ihale ekranından sabit fiyatı onaylayacağız.")
        send(car_tok, tid, "Harika — yükleme için 48 saat önce haber verin lütfen.")
        send(ship_tok, tid, "Not: nem oranı max %14, analiz raporu zorunlu.")

    return tid


def main() -> int:
    print(f"API: {API_BASE}")
    if already_seeded():
        print(f"SKIP: {MARKER} zaten mevcut — yeniden oluşturulmadı.")
        print("Zorla: FORCE_DEMO_SOHBET=1")
        if os.environ.get("FORCE_DEMO_SOHBET") != "1":
            return 0

    thread_ids: list[str] = []
    for i, (s, c) in enumerate(PAIRS, start=1):
        print(f"== Thread {i}: {s} ↔ {c} ==")
        tid = seed_pair(i, s, c)
        thread_ids.append(tid)
        print(f"OK threadId={tid}")

    print("")
    print("=== Demo sohbetler hazır ===")
    print("Giriş (şifre TestPass123!):")
    for s, c in PAIRS:
        print(f"  • {s}  veya  {c}")
    print(f"UI: https://app.lerta.com.tr/messaging?tab=sohbet")
    print("Thread id'ler:", ", ".join(thread_ids))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"HATA: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
