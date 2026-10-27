# WebRTC Meet — Faz 1 (Meet Core)

**Kap:** En fazla 3 katılımcı, P2P mesh.

## Özellikler

- Ayrı **Sesli ara** / **Görüntülü ara**
- Arama öncesi önizleme + mikrofon/kamera seçimi
- Görüşme süresi sayacı
- Mikrofon / kamera (görüntülü modda) kapatma
- Kısayollar: `M` sessiz, `V` kamera, `Esc` bitir
- `invite` sinyali (sesli vs görüntülü gelen arama metni)
- Zayıf bağlantıda ICE restart denemesi
- Oda dolu → 409 Türkçe mesaj

## API

- Status feature: `messaging_webrtc_meet_core_faz1`
- Sinyal tipi: `invite` (payload: `{"media":"audio"|"video"}`)

## Sonraki faz (Faz 2)

HD profilleri, aktif konuşmacı, arka plan bulanıklık, PiP.
