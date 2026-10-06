"use client";

import { IconChannels } from "./ChatUiIcons";
import { useMessagingWhatsappBridgeSnapshot } from "../../hooks/useMessagingWhatsappBridgeSnapshot";

type Props = {
  accessToken: string;
  isCompanyOwner: boolean;
  channelSettingsOpen: boolean;
  onOpenSettings: () => void;
};

/** FS-12 özet + hub içi ayar paneline geçiş (Ekolojik / NB mesajlar). */
export function MessagingWhatsappBridgeHubCard({
  accessToken,
  isCompanyOwner,
  channelSettingsOpen,
  onOpenSettings,
}: Props) {
  const { bridge, loading, error } = useMessagingWhatsappBridgeSnapshot(
    accessToken,
    isCompanyOwner,
  );

  if (!isCompanyOwner) {
    return null;
  }

  const statusLabel =
    loading && !bridge
      ? "Yükleniyor…"
      : bridge?.enabled
        ? bridge.configured
          ? "Bildirim köprüsü açık"
          : "Açık — numara eksik"
        : "Kapalı";

  return (
    <section
      className="messaging-wa-bridge-hub-card"
      aria-label="WhatsApp bildirim köprüsü FS-12"
    >
      <div className="messaging-wa-bridge-hub-card-head">
        <IconChannels size={18} aria-hidden />
        <div>
          <h3 className="messaging-wa-bridge-hub-card-title">
            WhatsApp bildirim köprüsü (FS-12)
          </h3>
          <p className="messaging-wa-bridge-hub-card-lead">
            Yeni firma mesajı için WhatsApp uyarısı + sohbet deep link — tam sohbet
            WA üzerinde değil, Lerta/Ekolojik mesajlar ekranında.
          </p>
        </div>
        <span
          className={
            bridge?.enabled
              ? "messaging-wa-bridge-hub-card-pill messaging-wa-bridge-hub-card-pill--on"
              : "messaging-wa-bridge-hub-card-pill"
          }
        >
          {statusLabel}
        </span>
      </div>
      {error ? <p className="error banner error--light">{error}</p> : null}
      {bridge?.notifyE164Masked ? (
        <p className="module-hint messaging-wa-bridge-hub-card-meta">
          Numara: <strong>{bridge.notifyE164Masked}</strong>
          {bridge.channel && bridge.channel !== "none"
            ? ` · Kanal: ${bridge.channel}`
            : ""}
        </p>
      ) : null}
      {bridge?.deliveryWarningTr ? (
        <p className="messaging-wa-bridge-hub-card-warn" role="alert">
          {bridge.deliveryWarningTr}
        </p>
      ) : null}
      <button
        type="button"
        className="messaging-wa-bridge-hub-card-btn"
        aria-expanded={channelSettingsOpen}
        onClick={onOpenSettings}
      >
        {channelSettingsOpen ? "Ayarlar açık (sohbet listesi altı)" : "Köprü ayarlarını aç"}
      </button>
    </section>
  );
}
