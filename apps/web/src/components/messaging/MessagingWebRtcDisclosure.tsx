"use client";

import { useEffect, useMemo, useState } from "react";
import { summarizeBrowserWebRtcSupport } from "@nakliyeborsasi/core";
import { resolveOpenSourceLicensesMailUrl } from "../../lib/lertaOpenSourceLicensesUrl";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";

type Props = {
  accessToken?: string | null;
};

/** W8 — görüntülü görüşme hazırlığı: tarayıcı WebRTC, codec'ler UA'da. */
export function MessagingWebRtcDisclosure({ accessToken }: Props) {
  const support = useMemo(() => summarizeBrowserWebRtcSupport(), []);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [signalingMode, setSignalingMode] = useState<string | null>(null);
  const licensesHref = accessToken
    ? resolveOpenSourceLicensesMailUrl(accessToken)
    : null;

  useEffect(() => {
    void fetchMessagingPublicStatus()
      .then((status) => {
        setFeatureEnabled(
          status.features.includes("browser_webrtc_disclosure"),
        );
        setSignalingMode(status.webrtc?.signaling ?? null);
      })
      .catch(() => setFeatureEnabled(false));
  }, []);

  if (!featureEnabled) {
    return null;
  }

  return (
    <p className="messaging-chat-compliance-webrtc module-hint" role="note">
      <strong>Görüntülü görüşme (WebRTC)</strong> — sinyalleşme:{" "}
      {signalingMode === "redis_relay"
        ? "Redis relay (SDP/ICE pilot)"
        : signalingMode === "unavailable"
          ? "relay geçici kapalı"
          : "hazırlanıyor"}
      ; ses/görüntü
      codec&apos;leri (libvpx, libwebm vb.){" "}
      {support.ready
        ? "bu tarayıcıda yerleşik olarak çalışır"
        : "bu ortamda WebRTC API bulunamadı"}
      , Lerta uygulaması ile dağıtılmaz.
      {licensesHref ? (
        <>
          {" "}
          <a href={licensesHref}>Açık kaynak lisansları</a>
        </>
      ) : null}
    </p>
  );
}
