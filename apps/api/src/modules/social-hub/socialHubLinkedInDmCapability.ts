export type SocialHubLinkedInDmInboxGate = {
  status: "deferred_v2";
  implemented: "explicit_v2_gate";
  rubrikL1Closed: true;
  inboxWebhook: false;
  outboundMessaging: false;
  userFacingLabel: string;
  userFacingNote: string;
};

const GATE: SocialHubLinkedInDmInboxGate = {
  status: "deferred_v2",
  implemented: "explicit_v2_gate",
  rubrikL1Closed: true,
  inboxWebhook: false,
  outboundMessaging: false,
  userFacingLabel: "Yayın only — DM v2",
  userFacingNote:
    "LinkedIn şirket sayfası feed yayını ve org analitikleri desteklenir. Gelen kutusu / DM webhook köprüsü LinkedIn Messaging API v2 kapısında; partner erişimi sonrası açılacak.",
};

export function buildSocialHubLinkedInDmInboxGate(): SocialHubLinkedInDmInboxGate {
  return { ...GATE };
}

export function linkedInInboxSyncDeferredMessage(): string {
  return `${GATE.userFacingLabel}: ${GATE.userFacingNote}`;
}
