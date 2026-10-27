"use client";

import { useEffect, useRef, useState } from "react";
import { acquireWebRtcLocalStream, type CallMediaMode } from "../../lib/messagingWebRtcDevices";
import { formatWebRtcMediaError } from "../../lib/messagingWebRtcMediaErrors";
import {
  buildSfuPilotSignalingUrl,
  type WebRtcMeetSfuSessionJoinBundle,
} from "../../lib/messagingWebRtcMeetSfuSession";

type Props = {
  join: WebRtcMeetSfuSessionJoinBundle;
  onClose: () => void;
};

export function MessagingWebRtcSfuPilotEmbed({ join, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Signaling yükleniyor…");
  const [error, setError] = useState("");

  const mediaMode: CallMediaMode = join.media === "audio" ? "audio" : "video";
  const signalingSrc = buildSfuPilotSignalingUrl(join);

  useEffect(() => {
    if (!join.embed.localMediaPreview) {
      return;
    }
    let cancelled = false;
    void acquireWebRtcLocalStream({ mode: mediaMode })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setStatus("Yerel medya hazır — SFU signaling bağlanıyor…");
      })
      .catch((err) => {
        setError(formatWebRtcMediaError(err));
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [join.embed.localMediaPreview, mediaMode]);

  return (
    <div
      className="messaging-webrtc-faz19-sfu-embed"
      role="region"
      aria-label="SFU pilot gömme"
    >
      <div className="messaging-webrtc-faz19-sfu-embed-toolbar">
        <span className="messaging-webrtc-faz19-sfu-embed-status">{status}</span>
        <button
          type="button"
          className="messaging-webrtc-pilot-btn"
          onClick={onClose}
        >
          Kapat
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="messaging-webrtc-faz19-sfu-embed-grid">
        {join.embed.localMediaPreview && join.media === "video" ? (
          <video
            ref={localVideoRef}
            className="messaging-webrtc-faz19-sfu-embed-local"
            autoPlay
            playsInline
            muted
          />
        ) : null}
        <iframe
          ref={iframeRef}
          title="SFU signaling"
          className="messaging-webrtc-faz19-sfu-embed-frame"
          src={signalingSrc}
          sandbox={join.embed.sandbox}
          onLoad={() => setStatus("Signaling iframe yüklendi (SFU medya harici).")}
        />
      </div>
      <p className="messaging-webrtc-faz19-sfu-embed-hint">{join.embed.hintTr}</p>
    </div>
  );
}
