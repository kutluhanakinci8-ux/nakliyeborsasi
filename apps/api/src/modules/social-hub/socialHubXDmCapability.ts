import {
  isXOutboundDeployEnabled,
  isXWebhookBridgeDeployEnabled,
} from "./socialHubXProdProvider";

export type SocialHubXDmInboxGate = {
  status: "deferred_v2" | "ready_v1";
  implemented: "explicit_v2_gate" | "deploy_flags";
  inboxWebhook: boolean;
  outboundMessaging: boolean;
  userFacingLabel: string;
  userFacingNote: string;
};

export function buildSocialHubXDmInboxGate(): SocialHubXDmInboxGate {
  const webhook = isXWebhookBridgeDeployEnabled();
  const outbound = isXOutboundDeployEnabled();
  if (webhook && outbound) {
    return {
      status: "ready_v1",
      implemented: "deploy_flags",
      inboxWebhook: true,
      outboundMessaging: true,
      userFacingLabel: "DM — webhook + giden",
      userFacingNote:
        "Gelen DM Account Activity webhook ile Mesajlar’a düşer; yanıtlar X API ile gider. OAuth’ta dm.read / dm.write için hesabı yeniden bağlayın; X konsolda webhook URL kayıtlı olmalı.",
    };
  }
  return {
    status: "deferred_v2",
    implemented: "explicit_v2_gate",
    inboxWebhook: webhook,
    outboundMessaging: outbound,
    userFacingLabel: "DM kısmi / kapalı",
    userFacingNote:
      webhook && !outbound
        ? "Webhook köprüsü açık; giden DM için SOCIAL_X_OUTBOUND_ENABLED=1 ve dm.write."
        : !webhook && outbound
          ? "Giden DM açık; gelen için SOCIAL_X_WEBHOOK_BRIDGE_ENABLED≠0 ve X webhook kaydı."
          : "DM için VPS: SOCIAL_X_WEBHOOK_BRIDGE_ENABLED (varsayılan açık), SOCIAL_X_OUTBOUND_ENABLED=1; OAuth yeniden bağlama (dm.read, dm.write).",
  };
}
