export function messagingVoiceTranscribeFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_TRANSCRIBE_FAZ1?.trim() === "1";
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
