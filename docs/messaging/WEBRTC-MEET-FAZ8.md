# WebRTC Meet — Faz 8 (QA kapı)

**Önkoşul:** Faz 1–7.

## Özellikler

- `scripts/verify-messaging-webrtc-meet-faz-gate.sh` — Meet feature bayrakları + Faz 6 ağ kapısı
- Post-deploy messaging gate zincirine eklenir

Status feature: `messaging_webrtc_meet_qa_gate_faz8`

## Manuel regresyon (hub)

1. Sesli / görüntülü arama, 3 kişi mesh, 409
2. Ekran paylaşımı, planlı görüşme, kayıt + arşiv indir
3. ICE/TURN rozeti ve `turnMonitor` status

## Sonraki (Faz 9+)

WS sinyal, gelen arama push, mobil deep link.
