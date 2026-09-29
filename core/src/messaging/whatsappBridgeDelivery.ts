export type WhatsappBridgeDeliveryEnv = {
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioWhatsappFrom?: string | null;
  twilioContentSid?: string | null;
  webhookUrl?: string | null;
};

export type WhatsappBridgeDeliverySnapshot = {
  channel: "twilio" | "webhook" | "none";
  deliveryConfigured: boolean;
  twilioContentSidConfigured: boolean;
  /** Twilio seçili ama ContentSid yok — trial hesaplarda Body 21654 verebilir. */
  twilioLikelyNeedsContentSid: boolean;
  deliveryWarningTr: string | null;
};

export function resolveWhatsappBridgeDelivery(
  env: WhatsappBridgeDeliveryEnv,
): WhatsappBridgeDeliverySnapshot {
  const accountSid = env.twilioAccountSid?.trim() ?? "";
  const authToken = env.twilioAuthToken?.trim() ?? "";
  const from = env.twilioWhatsappFrom?.trim() ?? "";
  const contentSid = env.twilioContentSid?.trim() ?? "";
  const webhookUrl = env.webhookUrl?.trim() ?? "";

  const twilioReady = Boolean(accountSid && authToken && from);
  const webhookReady = Boolean(webhookUrl);

  let channel: WhatsappBridgeDeliverySnapshot["channel"] = "none";
  if (twilioReady) {
    channel = "twilio";
  } else if (webhookReady) {
    channel = "webhook";
  }

  const deliveryConfigured = twilioReady || webhookReady;
  const twilioContentSidConfigured = Boolean(contentSid);
  const twilioLikelyNeedsContentSid = twilioReady && !twilioContentSidConfigured;

  let deliveryWarningTr: string | null = null;
  if (!deliveryConfigured) {
    deliveryWarningTr =
      "Sunucuda TWILIO_* veya MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL tanımlı değil.";
  } else if (twilioLikelyNeedsContentSid) {
    deliveryWarningTr =
      "Twilio WhatsApp: TWILIO_WHATSAPP_CONTENT_SID önerilir (trial/yeni hesaplar Body ile 21654 hatası verebilir). Şablon: tek değişken {{1}}.";
  }

  return {
    channel,
    deliveryConfigured,
    twilioContentSidConfigured,
    twilioLikelyNeedsContentSid,
    deliveryWarningTr,
  };
}
