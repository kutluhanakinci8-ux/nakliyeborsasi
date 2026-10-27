# WebRTC Meet — yol haritası (Faz 11+)

| Faz | Kod adı | Odak |
|-----|---------|------|
| 11 | `messaging_webrtc_meet_enterprise_faz11` | Kayıt arşivi S3 (bucket varsa), yükseltilmiş boyut limiti |
| 12 | `messaging_webrtc_meet_turn_prod_faz12` | TURN prod kapısı, deploy ICE script iyileştirme |
| 13 | `messaging_webrtc_meet_native_shell_faz13` | Expo shell → hub meet deep link |
| 14 | `messaging_webrtc_meet_ediscovery_faz14` | Kayıt arşivi eDiscovery manifest + SHA-256 |
| 15+ | — | SFU / &gt;3 kişi, RN WebRTC native (ürün kararı) |

Faz 1–14 (web mesh ≤3 kişi + mobil shell + eDiscovery export) kodlandı.
