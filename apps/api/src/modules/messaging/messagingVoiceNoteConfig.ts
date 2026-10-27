const DEFAULT_MAX_DURATION_MS = 180_000;

export function messagingVoiceNoteFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_NOTE_FAZ1?.trim() === "1";
}

export function messagingVoiceNotePlayerFaz2Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_NOTE_PLAYER_FAZ2?.trim() === "1";
}

export function messagingVoiceNoteMaxDurationMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MESSAGING_VOICE_NOTE_MAX_DURATION_MS?.trim();
  if (!raw) {
    return DEFAULT_MAX_DURATION_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 5_000 && parsed <= 600_000
    ? parsed
    : DEFAULT_MAX_DURATION_MS;
}
