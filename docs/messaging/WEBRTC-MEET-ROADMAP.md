# WebRTC Meet — yol haritası (Faz 11+)

| Faz | Kod adı | Odak |
|-----|---------|------|
| 11 | `messaging_webrtc_meet_enterprise_faz11` | Kayıt arşivi S3 (bucket varsa), yükseltilmiş boyut limiti |
| 12 | `messaging_webrtc_meet_turn_prod_faz12` | TURN prod kapısı, deploy ICE script iyileştirme |
| 13 | `messaging_webrtc_meet_native_shell_faz13` | Expo shell → hub meet deep link |
| 14 | `messaging_webrtc_meet_ediscovery_faz14` | Kayıt arşivi eDiscovery manifest + SHA-256 |
| 15 | `messaging_webrtc_meet_capacity_faz15` | Kapasite politikası (mesh ≤3, SFU kapalı, 409 metinleri) |
| 16 | `messaging_webrtc_meet_sfu_intent_faz16` | SFU beta overflow intent (Redis, ops sayacı) |
| 17 | `messaging_webrtc_meet_sfu_config_faz17` | SFU env + HTTP sağlık (mesh medya devam) |
| 18 | `messaging_webrtc_meet_sfu_session_faz18` | SFU oturum mint + join bundle (harici signaling) |
| 19 | `messaging_webrtc_meet_sfu_embed_faz19` | Tarayıcı gömme (local preview + signaling iframe) |
| 20 | `messaging_webrtc_meet_native_rtc_faz20` | Expo native RTC köprü + handshake API |
| 21 | `messaging_webrtc_meet_native_module_faz21` | RN WebRTC capabilities + SFU medya modu raporu |
| 22 | `messaging_webrtc_meet_rn_webrtc_pilot_faz22` | Native mesh pilot oturum API (linked dev client) |
| 23 | `messaging_webrtc_meet_rn_mesh_media_faz23` | RN sinyal tüketimi + LertaRnWebRTC mesh medya |
| 24 | `messaging_webrtc_meet_rn_rtc_view_faz24` | RTCView uzak video + arka plan poll |
| 25 | `messaging_webrtc_meet_program_closure_faz25` | GA program kapanışı + meetProgram status |

**Program tamamlandı** — `WEBRTC-MEET-CLOSURE.md`
