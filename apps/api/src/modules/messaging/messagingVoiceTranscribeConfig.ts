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

export function messagingVoiceSttLocalFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_STT_LOCAL_FAZ1?.trim() === "1";
}

export function messagingVoiceSttAuthOptional(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.MESSAGING_VOICE_STT_AUTH_OPTIONAL?.trim() === "1" ||
    env.MESSAGING_VOICE_STT_LOCAL_ENABLED?.trim() === "1"
  );
}

export function resolveMessagingVoiceSttApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const dedicated = env.MESSAGING_VOICE_STT_API_KEY?.trim();
  if (dedicated) {
    return dedicated;
  }
  return env.LERTA_MAIL_AI_COMPOSE_API_KEY?.trim() ?? "";
}

export function messagingVoiceSttConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const url = resolveMessagingVoiceSttApiUrl(env);
  if (!url) {
    return false;
  }
  const key = resolveMessagingVoiceSttApiKey(env);
  if (key) {
    return true;
  }
  return messagingVoiceSttAuthOptional(env);
}

export function resolveMessagingVoiceSttProvider(
  env: NodeJS.ProcessEnv = process.env,
): "local" | "openai" | "unconfigured" {
  if (!messagingVoiceSttConfigured(env)) {
    return "unconfigured";
  }
  const url = resolveMessagingVoiceSttApiUrl(env) ?? "";
  if (
    env.MESSAGING_VOICE_STT_LOCAL_ENABLED?.trim() === "1" ||
    /127\.0\.0\.1|localhost/.test(url)
  ) {
    return "local";
  }
  if (url.includes("api.openai.com")) {
    return "openai";
  }
  return "local";
}

export function resolveMessagingVoiceSttApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicit = env.MESSAGING_VOICE_STT_API_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const key = resolveMessagingVoiceSttApiKey(env);
  if (key) {
    return "https://api.openai.com/v1/audio/transcriptions";
  }
  if (messagingVoiceSttAuthOptional(env)) {
    return (
      env.MESSAGING_VOICE_STT_DEFAULT_URL?.trim() ||
      "http://127.0.0.1:9010/asr"
    ).replace(/\/$/, "");
  }
  return null;
}

export function messagingVoiceSttModel(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.MESSAGING_VOICE_STT_MODEL?.trim() || "whisper-1";
}

/** STT-OSS-3: Whisper `language` parametresi varsayılanı (ör. tr). */
export function messagingVoiceSttDefaultLanguage(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.MESSAGING_VOICE_STT_DEFAULT_LANGUAGE?.trim().toLowerCase();
  if (!raw) {
    return null;
  }
  return raw.slice(0, 8);
}

export function messagingVoiceSttGlossaryPath(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.MESSAGING_VOICE_STT_GLOSSARY_PATH?.trim();
  return raw || null;
}

export function messagingVoiceSttTrQualityFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_STT_TR_QUALITY_FAZ1?.trim() === "1";
}

/** STT-OSS-4: eşzamanlı transkripsiyon üst sınırı (0 = limitsiz). */
export function messagingVoiceSttMaxConcurrent(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MESSAGING_VOICE_STT_MAX_CONCURRENT?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 2;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2;
}

export function messagingVoiceSttReliabilityFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_STT_RELIABILITY_FAZ1?.trim() === "1";
}

/** STT-OSS-7: program kapanış gate (status feature). */
export function messagingVoiceSttOssGateFaz7Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_STT_OSS_GATE_FAZ7?.trim() === "1";
}

export const MESSAGING_VOICE_TRANSCRIBE_KVKK_NOTICE_TR =
  "Ses kaydınızı yazıya çevirmek için ses işleme (speech-to-text) yapılacaktır. İşlem, onayladığınız KVKK / AI asistan rızası ve firma mesajlaşma politikası kapsamında gerçekleşir.";
