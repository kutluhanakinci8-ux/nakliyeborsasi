import { describe, expect, it } from "vitest";
import { resolveWhatsappBridgeDelivery } from "./whatsappBridgeDelivery";

describe("resolveWhatsappBridgeDelivery", () => {
  it("returns none when env empty", () => {
    const snap = resolveWhatsappBridgeDelivery({});
    expect(snap.channel).toBe("none");
    expect(snap.deliveryConfigured).toBe(false);
    expect(snap.deliveryWarningTr).toMatch(/TWILIO/);
  });

  it("prefers twilio when fully configured", () => {
    const snap = resolveWhatsappBridgeDelivery({
      twilioAccountSid: "ACxxx",
      twilioAuthToken: "secret",
      twilioWhatsappFrom: "whatsapp:+14155238886",
      twilioContentSid: "HXabc",
      webhookUrl: "https://hooks.example/wa",
    });
    expect(snap.channel).toBe("twilio");
    expect(snap.deliveryConfigured).toBe(true);
    expect(snap.twilioLikelyNeedsContentSid).toBe(false);
    expect(snap.deliveryWarningTr).toBeNull();
  });

  it("warns when twilio without ContentSid", () => {
    const snap = resolveWhatsappBridgeDelivery({
      twilioAccountSid: "ACxxx",
      twilioAuthToken: "secret",
      twilioWhatsappFrom: "whatsapp:+14155238886",
    });
    expect(snap.twilioLikelyNeedsContentSid).toBe(true);
    expect(snap.deliveryWarningTr).toMatch(/CONTENT_SID/);
  });

  it("uses webhook when twilio incomplete", () => {
    const snap = resolveWhatsappBridgeDelivery({
      twilioAccountSid: "ACxxx",
      webhookUrl: "https://hooks.example/wa",
    });
    expect(snap.channel).toBe("webhook");
    expect(snap.deliveryConfigured).toBe(true);
  });
});
