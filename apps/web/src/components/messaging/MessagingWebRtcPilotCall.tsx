"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeBrowserWebRtcSupport } from "@nakliyeborsasi/core";
import { formatWebRtcMediaError } from "../../lib/messagingWebRtcMediaErrors";
import {
  acquireWebRtcLocalStream,
  formatCallDuration,
  listWebRtcMediaDevices,
  type CallMediaMode,
  type MediaDeviceLists,
} from "../../lib/messagingWebRtcDevices";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";
import {
  fetchMessagingWebRtcConfig,
  fetchMessagingWebRtcRoom,
  joinMessagingWebRtcRoom,
  leaveMessagingWebRtcRoom,
  pollMessagingWebRtcSignals,
  postMessagingWebRtcSignal,
  type WebRtcSignalEnvelope,
} from "../../lib/messagingWebRtcSignalingClient";

const MAX_PARTICIPANTS = 3;

type Props = {
  accessToken: string;
  threadId: string | null;
  currentUserId: string | null;
};

type PilotPhase =
  | "idle"
  | "precall"
  | "outgoing"
  | "incoming"
  | "connected"
  | "ended"
  | "error";

type RemotePeer = {
  userId: string;
  stream: MediaStream;
};

function attachStreamToVideo(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): void {
  if (!video || !stream) {
    return;
  }
  video.srcObject = stream;
  void video.play().catch(() => undefined);
}

function parseInviteMedia(payload: string): CallMediaMode {
  try {
    const data = JSON.parse(payload) as { media?: string };
    return data.media === "audio" ? "audio" : "video";
  } catch {
    return "video";
  }
}

export function MessagingWebRtcPilotCall({
  accessToken,
  threadId,
  currentUserId,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<PilotPhase>("idle");
  const [statusLine, setStatusLine] = useState("");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [incomingOffer, setIncomingOffer] =
    useState<WebRtcSignalEnvelope | null>(null);
  const [incomingMedia, setIncomingMedia] = useState<CallMediaMode>("video");
  const incomingOfferRef = useRef<WebRtcSignalEnvelope | null>(null);

  const [preCallMode, setPreCallMode] = useState<CallMediaMode>("video");
  const [devices, setDevices] = useState<MediaDeviceLists | null>(null);
  const [audioInputId, setAudioInputId] = useState("");
  const [videoInputId, setVideoInputId] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const callModeRef = useRef<CallMediaMode>("video");

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const inCallRef = useRef(false);
  const callStartedAtRef = useRef<number | null>(null);
  const browserReady = summarizeBrowserWebRtcSupport().ready;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const setRemoteForPeer = useCallback((userId: string, stream: MediaStream) => {
    setRemotePeers((prev) => {
      const rest = prev.filter((p) => p.userId !== userId);
      const next = [...rest, { userId, stream }];
      setStatusLine(
        `Bağlı (${Math.min(next.length + 1, MAX_PARTICIPANTS)}/${MAX_PARTICIPANTS})`,
      );
      return next;
    });
    setPhase("connected");
    if (!callStartedAtRef.current) {
      callStartedAtRef.current = Date.now();
    }
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  const teardown = useCallback(() => {
    stopPolling();
    inCallRef.current = false;
    callStartedAtRef.current = null;
    setCallSeconds(0);
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    iceQueuesRef.current.clear();
    stopPreview();
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    localStreamRef.current = null;
    setRemotePeers([]);
    setMicMuted(false);
    setVideoOff(false);
    seenSignalIdsRef.current.clear();
    lastPollIdRef.current = null;
    incomingOfferRef.current = null;
    setIncomingOffer(null);
    if (threadId) {
      void leaveMessagingWebRtcRoom(accessToken, threadId).catch(() => undefined);
    }
  }, [accessToken, stopPolling, stopPreview, threadId]);

  useEffect(() => {
    void fetchMessagingPublicStatus()
      .then((status) => {
        setEnabled(
          status.features.includes("messaging_webrtc_signaling_relay") &&
            status.features.includes("messaging_webrtc_mesh_three") &&
            status.features.includes("messaging_webrtc_meet_core_faz1") &&
            status.webrtc?.signaling === "redis_relay",
        );
      })
      .catch(() => setEnabled(false));
    return () => teardown();
  }, [teardown]);

  useEffect(() => {
    attachStreamToVideo(localVideoRef.current, localStream);
  }, [localStream, phase]);

  useEffect(() => {
    attachStreamToVideo(previewVideoRef.current, previewStream);
  }, [previewStream, phase]);

  useEffect(() => {
    if (phase !== "connected" && phase !== "outgoing") {
      return;
    }
    const timer = setInterval(() => {
      if (callStartedAtRef.current) {
        setCallSeconds(
          Math.floor((Date.now() - callStartedAtRef.current) / 1000),
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection, peerId: string) => {
    if (!pc.remoteDescription) {
      return;
    }
    const queue = iceQueuesRef.current.get(peerId) ?? [];
    iceQueuesRef.current.set(peerId, []);
    for (const candidate of queue) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const tryIceRestart = useCallback(
    async (peerUserId: string) => {
      const stream = localStreamRef.current;
      const pc = pcsRef.current.get(peerUserId);
      if (!stream || !pc || !threadId) {
        return;
      }
      setStatusLine("Bağlantı zayıf — yeniden deneniyor…");
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await postMessagingWebRtcSignal(
        accessToken,
        threadId,
        "offer",
        JSON.stringify(offer),
        peerUserId,
      );
    },
    [accessToken, threadId],
  );

  const ensurePeerConnection = useCallback(
    async (peerUserId: string, stream: MediaStream): Promise<RTCPeerConnection> => {
      const existing = pcsRef.current.get(peerUserId);
      if (existing) {
        return existing;
      }
      const config = await fetchMessagingWebRtcConfig(accessToken);
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });
      pcsRef.current.set(peerUserId, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        const [incoming] = event.streams;
        if (incoming) {
          setRemoteForPeer(peerUserId, incoming);
        }
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate || !threadId) {
          return;
        }
        void postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "ice",
          JSON.stringify(event.candidate),
          peerUserId,
        );
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          void tryIceRestart(peerUserId);
        }
      };
      return pc;
    },
    [accessToken, setRemoteForPeer, threadId, tryIceRestart],
  );

  const acquireLocalMedia = useCallback(async (): Promise<MediaStream> => {
    return acquireWebRtcLocalStream({
      mode: callModeRef.current,
      audioDeviceId: audioInputId || undefined,
      videoDeviceId: videoInputId || undefined,
    });
  }, [audioInputId, videoInputId]);

  const connectOffersToExistingPeers = useCallback(
    async (local: MediaStream, peerUserIds: string[]) => {
      for (const peerId of peerUserIds) {
        if (!currentUserId || peerId === currentUserId) {
          continue;
        }
        const pc = await ensurePeerConnection(peerId, local);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!threadId) {
          return;
        }
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "offer",
          JSON.stringify(offer),
          peerId,
        );
      }
    },
    [accessToken, currentUserId, ensurePeerConnection, threadId],
  );

  const processRemoteSignal = useCallback(
    async (signal: WebRtcSignalEnvelope) => {
      if (!threadId || !currentUserId || seenSignalIdsRef.current.has(signal.id)) {
        return;
      }
      const peerId = signal.fromUserId;
      if (peerId === currentUserId) {
        return;
      }
      seenSignalIdsRef.current.add(signal.id);
      lastPollIdRef.current = signal.id;

      if (signal.type === "invite") {
        setIncomingMedia(parseInviteMedia(signal.payload));
        return;
      }

      const local = localStreamRef.current;
      if (!local && signal.type !== "offer") {
        return;
      }

      try {
        if (signal.type === "hangup") {
          const pc = pcsRef.current.get(peerId);
          pc?.close();
          pcsRef.current.delete(peerId);
          setRemotePeers((prev) => prev.filter((p) => p.userId !== peerId));
          return;
        }

        if (signal.type === "offer") {
          if (!inCallRef.current) {
            if (!incomingOfferRef.current) {
              incomingOfferRef.current = signal;
              setIncomingOffer(signal);
              setPhase("incoming");
              setStatusLine(
                incomingMedia === "audio"
                  ? "Gelen sesli arama"
                  : "Gelen görüntülü arama",
              );
            }
            return;
          }
          const media = local ?? (await acquireLocalMedia());
          if (!localStreamRef.current) {
            localStreamRef.current = media;
            setLocalStream(media);
          }
          const pc = await ensurePeerConnection(peerId, media);
          const offer = JSON.parse(
            signal.payload,
          ) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(offer);
          await flushIceQueue(pc, peerId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postMessagingWebRtcSignal(
            accessToken,
            threadId,
            "answer",
            JSON.stringify(answer),
            peerId,
          );
        } else if (signal.type === "answer") {
          const pc = pcsRef.current.get(peerId);
          if (!pc) {
            return;
          }
          const answer = JSON.parse(
            signal.payload,
          ) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(answer);
          await flushIceQueue(pc, peerId);
        } else if (signal.type === "ice") {
          const pc = pcsRef.current.get(peerId);
          if (!pc) {
            return;
          }
          const candidate = JSON.parse(
            signal.payload,
          ) as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            const queue = iceQueuesRef.current.get(peerId) ?? [];
            queue.push(candidate);
            iceQueuesRef.current.set(peerId, queue);
          }
        }
      } catch (err) {
        setPhase("error");
        setError(formatWebRtcMediaError(err));
      }
    },
    [
      accessToken,
      acquireLocalMedia,
      currentUserId,
      ensurePeerConnection,
      flushIceQueue,
      incomingMedia,
      threadId,
    ],
  );

  useEffect(() => {
    if (!enabled || !threadId || phase !== "idle" || inCallRef.current) {
      return;
    }
    const timer = setInterval(() => {
      void pollMessagingWebRtcSignals(
        accessToken,
        threadId,
        lastPollIdRef.current,
      )
        .then((signals) => {
          for (const signal of signals) {
            if (signal.type === "invite" || signal.type === "offer") {
              void processRemoteSignal(signal);
            }
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [accessToken, enabled, phase, processRemoteSignal, threadId]);

  const syncNewRoomPeers = useCallback(async () => {
    if (!threadId || !currentUserId || !localStreamRef.current) {
      return;
    }
    const room = await fetchMessagingWebRtcRoom(accessToken, threadId);
    const missing = room.participants
      .map((p) => p.userId)
      .filter((id) => id !== currentUserId && !pcsRef.current.has(id));
    if (missing.length > 0) {
      await connectOffersToExistingPeers(localStreamRef.current, missing);
    }
  }, [accessToken, connectOffersToExistingPeers, currentUserId, threadId]);

  const startPolling = useCallback(() => {
    if (!threadId || pollTimerRef.current) {
      return;
    }
    pollTimerRef.current = setInterval(() => {
      void syncNewRoomPeers().catch(() => undefined);
      void pollMessagingWebRtcSignals(
        accessToken,
        threadId,
        lastPollIdRef.current,
      )
        .then((signals) => {
          for (const signal of signals) {
            void processRemoteSignal(signal);
          }
        })
        .catch(() => undefined);
    }, 1500);
  }, [accessToken, processRemoteSignal, syncNewRoomPeers, threadId]);

  async function postCallInvite(): Promise<void> {
    if (!threadId) {
      return;
    }
    await postMessagingWebRtcSignal(
      accessToken,
      threadId,
      "invite",
      JSON.stringify({ media: callModeRef.current }),
      null,
    );
  }

  async function enterCallAndMesh(): Promise<void> {
    if (!threadId || !currentUserId) {
      return;
    }
    stopPreview();
    const room = await joinMessagingWebRtcRoom(accessToken, threadId);
    inCallRef.current = true;
    callStartedAtRef.current = Date.now();
    await postCallInvite();
    const others = room.participants
      .map((p) => p.userId)
      .filter((id) => id !== currentUserId);
    const local = await acquireLocalMedia();
    localStreamRef.current = local;
    setLocalStream(local);
    setVideoOff(callModeRef.current === "audio");
    await connectOffersToExistingPeers(local, others);
    startPolling();
    if (others.length === 0) {
      setStatusLine(`Bekleniyor (en fazla ${MAX_PARTICIPANTS} kişi)…`);
    }
  }

  async function openPreCall(mode: CallMediaMode): Promise<void> {
    setError("");
    setPreCallMode(mode);
    callModeRef.current = mode;
    setPhase("precall");
    try {
      const listed = await listWebRtcMediaDevices();
      setDevices(listed);
      const stream = await acquireWebRtcLocalStream({
        mode,
        audioDeviceId: audioInputId || undefined,
        videoDeviceId: videoInputId || undefined,
      });
      setPreviewStream(stream);
    } catch (err) {
      setPhase("error");
      setError(formatWebRtcMediaError(err));
    }
  }

  async function confirmPreCall(): Promise<void> {
    stopPreview();
    setPhase("outgoing");
    setStatusLine("Bağlanıyor…");
    try {
      await enterCallAndMesh();
      setPhase("connected");
    } catch (err) {
      teardown();
      setPhase("error");
      setError(formatWebRtcMediaError(err));
    }
  }

  function cancelPreCall(): void {
    stopPreview();
    setPhase("idle");
    setStatusLine("");
  }

  async function acceptIncomingCall(): Promise<void> {
    if (!threadId || !incomingOffer || incomingOffer.type !== "offer") {
      return;
    }
    callModeRef.current = incomingMedia;
    setError("");
    setStatusLine("Bağlanıyor…");
    try {
      await enterCallAndMesh();
      const offer = incomingOffer;
      incomingOfferRef.current = null;
      setIncomingOffer(null);
      await processRemoteSignal(offer);
      setPhase("connected");
    } catch (err) {
      teardown();
      setPhase("error");
      setError(formatWebRtcMediaError(err));
    }
  }

  function declineIncomingCall(): void {
    incomingOfferRef.current = null;
    setIncomingOffer(null);
    setPhase("idle");
    setStatusLine("");
  }

  function toggleMic(): void {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const next = !micMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMicMuted(next);
  }

  function toggleVideo(): void {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const next = !videoOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setVideoOff(next);
  }

  async function endCall(): Promise<void> {
    if (threadId && currentUserId) {
      for (const peerId of pcsRef.current.keys()) {
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "hangup",
          "{}",
          peerId,
        ).catch(() => undefined);
      }
    }
    teardown();
    setPhase("ended");
    setStatusLine("Arama sonlandı");
  }

  useEffect(() => {
    if (phase !== "connected" && phase !== "outgoing") {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "m") {
        event.preventDefault();
        toggleMic();
      } else if (key === "v") {
        event.preventDefault();
        toggleVideo();
      } else if (key === "escape") {
        event.preventDefault();
        void endCall();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, micMuted, videoOff]);

  if (!enabled || !threadId || !browserReady || !currentUserId) {
    return null;
  }

  const inCallUi =
    phase === "outgoing" || phase === "connected";
  const showVideos =
    inCallUi && callModeRef.current === "video" && !videoOff;

  return (
    <div
      className="messaging-webrtc-pilot messaging-webrtc-meet-faz1"
      role="region"
      aria-label="Görüntülü ve sesli görüşme (en fazla 3 kişi)"
    >
      <div className="messaging-webrtc-pilot-toolbar">
        {phase === "incoming" ? (
          <>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => void acceptIncomingCall()}
            >
              {incomingMedia === "audio" ? "Sesli aramayı kabul et" : "Görüntülü kabul et"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--end"
              onClick={() => declineIncomingCall()}
            >
              Reddet
            </button>
          </>
        ) : phase === "precall" ? (
          <>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--primary"
              onClick={() => void confirmPreCall()}
            >
              {preCallMode === "audio" ? "Sesli görüşmeyi başlat" : "Görüntülü görüşmeyi başlat"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => cancelPreCall()}
            >
              İptal
            </button>
          </>
        ) : phase === "idle" || phase === "ended" || phase === "error" ? (
          <>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => void openPreCall("audio")}
            >
              Sesli ara
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--primary"
              onClick={() => void openPreCall("video")}
            >
              Görüntülü ara
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`messaging-webrtc-pilot-btn ${micMuted ? "is-muted" : ""}`}
              onClick={() => toggleMic()}
              title="Mikrofon (M)"
            >
              {micMuted ? "Sessiz" : "Mikrofon"}
            </button>
            {callModeRef.current === "video" ? (
              <button
                type="button"
                className={`messaging-webrtc-pilot-btn ${videoOff ? "is-muted" : ""}`}
                onClick={() => toggleVideo()}
                title="Kamera (V)"
              >
                {videoOff ? "Kamera kapalı" : "Kamera"}
              </button>
            ) : null}
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--end"
              onClick={() => void endCall()}
              title="Bitir (Esc)"
            >
              Bitir
            </button>
          </>
        )}
        {inCallUi && callStartedAtRef.current ? (
          <span className="messaging-webrtc-pilot-timer" aria-live="polite">
            {formatCallDuration(callSeconds)}
          </span>
        ) : null}
        {statusLine ? (
          <span className="messaging-webrtc-pilot-status">{statusLine}</span>
        ) : null}
        {error ? (
          <span className="messaging-webrtc-pilot-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>

      {phase === "precall" ? (
        <div className="messaging-webrtc-precall">
          {preCallMode === "video" ? (
            <video
              ref={previewVideoRef}
              className="messaging-webrtc-pilot-video messaging-webrtc-precall-preview"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <p className="messaging-webrtc-precall-audio-hint">
              Mikrofon testi — konuşunca seviye göstergesi tarayıcıda görünür.
            </p>
          )}
          {devices ? (
            <div className="messaging-webrtc-device-picks">
              <label>
                Mikrofon
                <select
                  value={audioInputId}
                  onChange={(e) => setAudioInputId(e.target.value)}
                >
                  <option value="">Varsayılan</option>
                  {devices.audioInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || "Mikrofon"}
                    </option>
                  ))}
                </select>
              </label>
              {preCallMode === "video" ? (
                <label>
                  Kamera
                  <select
                    value={videoInputId}
                    onChange={(e) => setVideoInputId(e.target.value)}
                  >
                    <option value="">Varsayılan</option>
                    {devices.videoInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || "Kamera"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <p className="messaging-webrtc-precall-hint">
            En fazla {MAX_PARTICIPANTS} kişi · Kısayol: M sessiz, V kamera, Esc bitir
          </p>
        </div>
      ) : null}

      {showVideos || (inCallUi && remotePeers.length > 0) ? (
        <div className="messaging-webrtc-pilot-videos messaging-webrtc-pilot-videos--mesh">
          {showVideos ? (
            <video
              ref={localVideoRef}
              className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--local"
              autoPlay
              muted
              playsInline
            />
          ) : null}
          {remotePeers.map((peer) => (
            <video
              key={peer.userId}
              className="messaging-webrtc-pilot-video messaging-webrtc-pilot-video--remote"
              autoPlay
              playsInline
              ref={(el) => attachStreamToVideo(el, peer.stream)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
