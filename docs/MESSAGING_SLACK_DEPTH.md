# Mesajlaşma — Slack derinliği (P5)

Kanal, gelen webhook bot ve kurumsal mesaj araması (Slack-benzeri derinlik, tam Slack API değil).

## Özellikler

| Özellik | API | Not |
|---------|-----|-----|
| **Şirket kanalları** | `GET/POST /api/v1/messaging/channels` | Varsayılan: `genel`, `duyurular`, `operasyon` |
| **Kanal sohbeti** | Mevcut `threads` + `threadKind=org_channel` | Liste otomatik seed |
| **Kurumsal arama** | `GET /api/v1/messaging/search?q=` | `COMPANY_OWNER` veya `VIEWER`, min 2 karakter |
| **Bot webhook** | `POST /api/v1/messaging/bot/incoming` | Header `X-Messaging-Bot-Token` |
| **Token yönetimi** | `POST /api/v1/messaging/bot/rotate-token` | Yalnızca firma sahibi |

## Bot örneği

```bash
curl -sS -X POST https://app.lerta.com.tr/api/v1/messaging/bot/incoming \
  -H "Content-Type: application/json" \
  -H "X-Messaging-Bot-Token: $TOKEN" \
  -d '{"channelSlug":"duyurular","text":"İhale #442 kapandı.","botName":"İhale Bot"}'
```

## Veritabanı

`scripts/sql/messaging-slack-depth-p5.sql` — `TYPEORM_SYNCHRONIZE=false` VPS’lerde uygulayın.

## UI

`/messaging` → Sohbet: kanal rozeti, firma sahibi için **Kurumsal ara** ve **Bot webhook token**.

## Kapsam dışı

Slack OAuth, harici workspace sync, threaded replies, emoji reactions, tam enterprise grid search.
