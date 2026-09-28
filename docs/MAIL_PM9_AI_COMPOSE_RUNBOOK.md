# PM-9 — AI yanıt önerisi runbook

## Ortam
| Değişken | Açıklama |
|----------|----------|
| `LERTA_MAIL_AI_COMPOSE_ENABLED` | `true` — özellik açık |
| `LERTA_MAIL_AI_COMPOSE_API_URL` | OpenAI uyumlu chat completions URL (opsiyonel; anahtar varsa varsayılan OpenAI) |
| `LERTA_MAIL_AI_COMPOSE_API_KEY` | Bearer token |
| `LERTA_MAIL_AI_COMPOSE_MODEL` | Varsayılan `gpt-4o-mini` |

## VPS
```bash
bash scripts/enable-mail-ai-compose-env.sh /var/www/nakliyeborsasi
# İsteğe bağlı: LERTA_MAIL_AI_COMPOSE_API_KEY=sk-... bash scripts/enable-mail-ai-compose-env.sh
bash scripts/restart-api.sh
bash scripts/verify-mail-ai-compose-prod.sh
```

Webmail: mesaj okuma → **Yanıt öner**. `GET company/mail-inbox/integration-status` → `aiCompose.llmConfigured`.
