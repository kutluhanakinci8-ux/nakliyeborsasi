export type SocialHubXDmInboxGate = {
  status: "deferred_v2";
  implemented: "explicit_v2_gate";
  inboxWebhook: false;
  outboundMessaging: false;
  userFacingLabel: string;
  userFacingNote: string;
};

const GATE: SocialHubXDmInboxGate = {
  status: "deferred_v2",
  implemented: "explicit_v2_gate",
  inboxWebhook: false,
  outboundMessaging: false,
  userFacingLabel: "OAuth bağlantı — DM v2",
  userFacingNote:
    "@lertalogistics hesabı OAuth ile bağlanır; token yenileme desteklenir. Gelen kutusu / DM köprüsü X API ücretli katman ve Account Activity webhook sonrası açılacak.",
};

export function buildSocialHubXDmInboxGate(): SocialHubXDmInboxGate {
  return { ...GATE };
}
