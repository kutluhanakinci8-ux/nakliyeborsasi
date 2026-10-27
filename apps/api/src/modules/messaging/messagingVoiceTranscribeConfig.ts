export function messagingVoiceTranscribeFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_TRANSCRIBE_FAZ1?.trim() === "1";
}

export function messagingVoiceTranscribeAdvancedFaz2Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_TRANSCRIBE_ADVANCED_FAZ2?.trim() === "1";
}

export function messagingVoiceTranscribeAutoFaz3Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3?.trim() === "1";
}

export function messagingVoiceSttMonthlyQuotaPerCompany(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MESSAGING_VOICE_STT_MONTHLY_QUOTA?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

export function messagingVoiceSttConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const key = env.LERTA_MAIL_AI_COMPOSE_API_KEY?.trim();
  const url =
    env.MESSAGING_VOICE_STT_API_URL?.trim() ||
    (key ? "https://api.openai.com/v1/audio/transcriptions" : "");
  return Boolean(url && key);
}

export function resolveMessagingVoiceSttApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicit = env.MESSAGING_VOICE_STT_API_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const key = env.LERTA_MAIL_AI_COMPOSE_API_KEY?.trim();
  if (key) {
    return "https://api.openai.com/v1/audio/transcriptions";
  }
  return null;
}

export function messagingVoiceSttModel(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.MESSAGING_VOICE_STT_MODEL?.trim() || "whisper-1";
}

export const MESSAGING_VOICE_TRANSCRIBE_KVKK_NOTICE_TR =
  "Ses kaydınızı yazıya çevirmek için ses işleme (speech-to-text) yapılacaktır. İşlem, onayladığınız KVKK / AI asistan rızası ve firma mesajlaşma politikası kapsamında gerçekleşir.";
