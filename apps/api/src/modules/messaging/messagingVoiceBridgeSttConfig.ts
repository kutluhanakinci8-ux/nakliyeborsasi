export function messagingVoiceBridgeSttFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_BRIDGE_STT_FAZ1?.trim() === "1";
}
