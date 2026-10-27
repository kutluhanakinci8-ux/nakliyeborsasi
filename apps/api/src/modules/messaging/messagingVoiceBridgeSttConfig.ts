export function messagingVoiceBridgeSttFaz1Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.MESSAGING_VOICE_BRIDGE_STT_FAZ1?.trim() === "1";
}

/** BR-2: WhatsApp inbound audio → Graph media download → voice_note + bridge STT */
export function messagingVoiceBridgeWaInboundFaz2Enabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    messagingVoiceBridgeSttFaz1Enabled(env) &&
    env.MESSAGING_VOICE_BRIDGE_WA_INBOUND_FAZ2?.trim() === "1"
  );
}
