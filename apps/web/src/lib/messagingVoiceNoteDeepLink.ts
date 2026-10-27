/** VM-4: mobil push / deep link `voiceNote=1` */
export const MESSAGING_VOICE_NOTE_DEEPLINK_PARAM = "voiceNote";

export function isMessagingVoiceNoteDeepLink(
  searchParams: URLSearchParams | Readonly<URLSearchParams>,
): boolean {
  return searchParams.get(MESSAGING_VOICE_NOTE_DEEPLINK_PARAM) === "1";
}

export function stripMessagingVoiceNoteDeepLinkParam(
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete(MESSAGING_VOICE_NOTE_DEEPLINK_PARAM);
  return next;
}
