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
import {
  networkQualityLabel,
  sampleNetworkQuality,
  type NetworkQualityLevel,
} from "../../lib/messagingWebRtcNetworkMonitor";
import {
  applyQualityToAllPeerConnections,
  applyVideoSenderBitrate,
  qualityProfileLabel,
  type CallLayoutMode,
  type VideoEffect,
  type VideoQualityProfile,
} from "../../lib/messagingWebRtcQuality";
import { attachStreamLevelMeter } from "../../lib/messagingWebRtcSpeakerLevel";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";
import { MessagingApiClient } from "../../lib/MessagingApiClient";
import type { MessagingListingCardRecord } from "../../lib/MessagingApiClient";
import {
  clearMessagingWebRtcMeetSchedule,
  downloadMeetIcsFile,
  fetchMessagingWebRtcMeetSchedule,
  formatMeetScheduleLocal,
  upsertMessagingWebRtcMeetSchedule,
  type WebRtcMeetScheduleRecord,
} from "../../lib/messagingWebRtcMeetSchedule";
import {
  blobToBase64,
  downloadArchiveWebmFromBase64,
  fetchMessagingWebRtcRecordingArchiveBlob,
  fetchMessagingWebRtcRecordingArchives,
  postMessagingWebRtcRecordingArchive,
  type WebRtcMeetRecordingArchiveMeta,
} from "../../lib/messagingWebRtcMeetArchive";
import {
  downloadMeetRecordingBlob,
  startMeetLocalRecorder,
  type MeetLocalRecorder,
} from "../../lib/messagingWebRtcLocalRecorder";
import { replaceOutgoingVideoTrack } from "../../lib/messagingWebRtcScreenShare";
import {
  buildMessagingMeetDeepLink,
  isLikelyMobileBrowser,
  isMeetDeepLinkActive,
} from "../../lib/messagingWebRtcMeetDeepLink";
import {
  startMeetIncomingRing,
  stopMeetIncomingRing,
} from "../../lib/messagingWebRtcRing";
import {
  fetchMessagingWebRtcConfig,
  fetchMessagingWebRtcRoom,
  joinMessagingWebRtcRoom,
  leaveMessagingWebRtcRoom,
  pollMessagingWebRtcSignals,
  postMessagingWebRtcSignal,
  type MessagingWebRtcIceCaps,
  type MessagingWebRtcTurnMonitor,
  type WebRtcSignalEnvelope,
} from "../../lib/messagingWebRtcSignalingClient";

const QUICK_REACTIONS = ["👍", "👏", "❤️", "😂"] as const;

const MAX_PARTICIPANTS = 3;
const MEET_POLL_IDLE_MS = 750;
const MEET_POLL_INCALL_MS = 900;

type Props = {
  accessToken: string;
  locale: string;
  threadId: string | null;
  currentUserId: string | null;
  threadTitle?: string;
  listingCard?: MessagingListingCardRecord | null;
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

function parseScreenSharing(payload: string): boolean {
  try {
    const data = JSON.parse(payload) as { sharing?: boolean };
    return Boolean(data.sharing);
  } catch {
    return false;
  }
}

function iceCapsStatusLabel(
  caps: MessagingWebRtcIceCaps | null,
  turnMonitor: MessagingWebRtcTurnMonitor | null,
): string {
  const monitorHint =
    turnMonitor?.enabled && turnMonitor.activeAllocationsHint != null
      ? ` · alloc ~${turnMonitor.activeAllocationsHint}`
      : "";
  if (!caps) {
    return `ICE…${monitorHint}`;
  }
  if (caps.turnUrlCount > 0 && caps.turnCredentialsConfigured) {
    return `TURN hazır${monitorHint}`;
  }
  if (caps.usingDefaultStunOnly) {
    return `Yalnızca STUN${monitorHint}`;
  }
  if (caps.turnUrlCount > 0) {
    return `TURN eksik kimlik${monitorHint}`;
  }
  return `STUN ×${caps.stunUrlCount}${monitorHint}`;
}

function defaultDatetimeLocalValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MessagingWebRtcPilotCall({
  accessToken,
  locale,
  threadId,
  currentUserId,
  threadTitle,
  listingCard,
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
  const [qualityProfile, setQualityProfile] = useState<VideoQualityProfile>("auto");
  const [layoutMode, setLayoutMode] = useState<CallLayoutMode>("grid");
  const [videoEffect, setVideoEffect] = useState<VideoEffect>("none");
  const [networkLevel, setNetworkLevel] = useState<NetworkQualityLevel>("unknown");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedPeerIds, setRaisedPeerIds] = useState<string[]>([]);
  const [peerReactions, setPeerReactions] = useState<Record<string, string>>({});
  const [linkCopied, setLinkCopied] = useState(false);
  const [iceCaps, setIceCaps] = useState<MessagingWebRtcIceCaps | null>(null);
  const [meetSchedule, setMeetSchedule] = useState<WebRtcMeetScheduleRecord | null>(
    null,
  );
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false);
  const [scheduleAtLocal, setScheduleAtLocal] = useState("");
  const [scheduleMedia, setScheduleMedia] = useState<CallMediaMode>("video");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [turnMonitor, setTurnMonitor] =
    useState<MessagingWebRtcTurnMonitor | null>(null);
  const [maxRecordingArchiveBytes, setMaxRecordingArchiveBytes] = useState(
    2_500_000,
  );
  const [recordingArchives, setRecordingArchives] = useState<
    WebRtcMeetRecordingArchiveMeta[]
  >([]);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const meetRecorderRef = useRef<MeetLocalRecorder | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const reactionClearTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const speakerMetersRef = useRef<Map<string, ReturnType<typeof attachStreamLevelMeter>>>(
    new Map(),
  );
  const thirdPersonWarnedRef = useRef(false);
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
      if (next.length >= 2 && !thirdPersonWarnedRef.current) {
        thirdPersonWarnedRef.current = true;
        setStatusLine(
          "3 kişi — upload yüksek; Veri tasarrufu veya sesli mod önerilir.",
        );
      } else {
        setStatusLine(
          `Bağlı (${Math.min(next.length + 1, MAX_PARTICIPANTS)}/${MAX_PARTICIPANTS})`,
        );
      }
      return next;
    });
    if (!speakerMetersRef.current.has(userId) && stream.getAudioTracks().length > 0) {
      speakerMetersRef.current.set(userId, attachStreamLevelMeter(stream));
    }
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
    stopMeetIncomingRing();
    stopPreview();
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    localStreamRef.current = null;
    setRemotePeers([]);
    setMicMuted(false);
    setVideoOff(false);
    setActiveSpeakerId(null);
    setNetworkLevel("unknown");
    setScreenSharing(false);
    setHandRaised(false);
    setRaisedPeerIds([]);
    setPeerReactions({});
    setLinkCopied(false);
    if (meetRecorderRef.current) {
      void meetRecorderRef.current.stop().catch(() => undefined);
      meetRecorderRef.current = null;
    }
    setRecording(false);
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    cameraVideoTrackRef.current = null;
    for (const timer of reactionClearTimersRef.current.values()) {
      clearTimeout(timer);
    }
    reactionClearTimersRef.current.clear();
    thirdPersonWarnedRef.current = false;
    for (const meter of speakerMetersRef.current.values()) {
      meter.stop();
    }
    speakerMetersRef.current.clear();
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
            status.features.includes("messaging_webrtc_meet_hd_faz2") &&
            status.features.includes("messaging_webrtc_meet_biz_faz3") &&
            status.features.includes("messaging_webrtc_meet_ops_faz4") &&
            status.features.includes("messaging_webrtc_meet_reliability_faz5") &&
            status.features.includes("messaging_webrtc_meet_prod_net_faz6") &&
            status.features.includes("messaging_webrtc_meet_compliance_faz7") &&
            status.features.includes("messaging_webrtc_meet_qa_gate_faz8") &&
            status.features.includes("messaging_webrtc_meet_realtime_faz9") &&
            status.features.includes("messaging_webrtc_meet_mobile_faz10") &&
            status.webrtc?.signaling === "redis_relay",
        );
      })
      .catch(() => setEnabled(false));
    return () => teardown();
  }, [teardown]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }
    void fetchMessagingWebRtcConfig(accessToken)
      .then((config) => {
        setIceCaps(config.iceCaps ?? null);
        setTurnMonitor(config.turnMonitor ?? null);
        setMaxRecordingArchiveBytes(
          config.maxRecordingArchiveBytes ?? 2_500_000,
        );
      })
      .catch(() => {
        setIceCaps(null);
        setTurnMonitor(null);
      });
  }, [accessToken, enabled]);

  useEffect(() => {
    if (!enabled || !threadId || !accessToken) {
      setMeetSchedule(null);
      setRecordingArchives([]);
      return;
    }
    void fetchMessagingWebRtcMeetSchedule(accessToken, threadId)
      .then(setMeetSchedule)
      .catch(() => setMeetSchedule(null));
    void fetchMessagingWebRtcRecordingArchives(accessToken, threadId)
      .then(setRecordingArchives)
      .catch(() => setRecordingArchives([]));
  }, [accessToken, enabled, threadId]);

  useEffect(() => {
    if (!enabled || !threadId || phase !== "idle") {
      return;
    }
    if (isMeetDeepLinkActive()) {
      setStatusLine("Görüşme daveti — sesli veya görüntülü aramayı başlatın.");
    }
  }, [enabled, phase, threadId]);

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

  useEffect(() => {
    if (phase === "incoming") {
      startMeetIncomingRing();
      return () => stopMeetIncomingRing();
    }
    stopMeetIncomingRing();
    return undefined;
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
      void applyVideoSenderBitrate(pc, qualityProfile);
      return pc;
    },
    [accessToken, qualityProfile, setRemoteForPeer, threadId, tryIceRestart],
  );

  const acquireLocalMedia = useCallback(async (): Promise<MediaStream> => {
    return acquireWebRtcLocalStream({
      mode: callModeRef.current,
      audioDeviceId: audioInputId || undefined,
      videoDeviceId: videoInputId || undefined,
      qualityProfile,
    });
  }, [audioInputId, qualityProfile, videoInputId]);

  useEffect(() => {
    if (phase !== "connected" && phase !== "outgoing") {
      return;
    }
    const timer = setInterval(() => {
      const firstPc = pcsRef.current.values().next().value as
        | RTCPeerConnection
        | undefined;
      if (firstPc) {
        void sampleNetworkQuality(firstPc).then(setNetworkLevel);
      }
      let bestId: string | null = null;
      let bestLevel = 0;
      for (const [userId, meter] of speakerMetersRef.current.entries()) {
        const level = meter.getLevel();
        if (level > bestLevel) {
          bestLevel = level;
          bestId = userId;
        }
      }
      if (bestLevel > 8) {
        setActiveSpeakerId(bestId);
      }
    }, 400);
    return () => clearInterval(timer);
  }, [phase, remotePeers.length]);

  useEffect(() => {
    void applyQualityToAllPeerConnections(pcsRef.current.values(), qualityProfile);
  }, [qualityProfile, remotePeers.length]);

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

      if (signal.type === "raise") {
        try {
          const data = JSON.parse(signal.payload) as { raised?: boolean };
          setRaisedPeerIds((prev) => {
            const set = new Set(prev);
            if (data.raised) {
              set.add(peerId);
            } else {
              set.delete(peerId);
            }
            return [...set];
          });
        } catch {
          /* ignore */
        }
        return;
      }

      if (signal.type === "reaction") {
        try {
          const data = JSON.parse(signal.payload) as { emoji?: string };
          if (data.emoji) {
            setPeerReactions((prev) => ({ ...prev, [peerId]: data.emoji! }));
            const existing = reactionClearTimersRef.current.get(peerId);
            if (existing) {
              clearTimeout(existing);
            }
            reactionClearTimersRef.current.set(
              peerId,
              setTimeout(() => {
                setPeerReactions((prev) => {
                  const next = { ...prev };
                  delete next[peerId];
                  return next;
                });
                reactionClearTimersRef.current.delete(peerId);
              }, 4500),
            );
          }
        } catch {
          /* ignore */
        }
        return;
      }

      if (signal.type === "screen") {
        setStatusLine(
          parseScreenSharing(signal.payload)
            ? "Karşı taraf ekran paylaşıyor"
            : "Ekran paylaşımı bitti",
        );
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
          speakerMetersRef.current.get(peerId)?.stop();
          speakerMetersRef.current.delete(peerId);
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
    }, MEET_POLL_IDLE_MS);
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
    }, MEET_POLL_INCALL_MS);
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
    if (screenSharing) {
      return;
    }
    const next = !videoOff;
    stream.getVideoTracks().forEach((t) => {
      if (t !== screenTrackRef.current) {
        t.enabled = !next;
      }
    });
    setVideoOff(next);
  }

  async function stopScreenShare(): Promise<void> {
    const local = localStreamRef.current;
    const screenTrack = screenTrackRef.current;
    const cameraTrack = cameraVideoTrackRef.current;
    if (!local || !screenTrack) {
      setScreenSharing(false);
      return;
    }
    screenTrack.stop();
    local.removeTrack(screenTrack);
    screenTrackRef.current = null;
    if (cameraTrack && callModeRef.current === "video") {
      cameraTrack.enabled = !videoOff;
      if (!local.getVideoTracks().includes(cameraTrack)) {
        local.addTrack(cameraTrack);
      }
      await replaceOutgoingVideoTrack(pcsRef.current.values(), cameraTrack);
    } else {
      await replaceOutgoingVideoTrack(pcsRef.current.values(), null);
    }
    setLocalStream(new MediaStream(local.getTracks()));
    setScreenSharing(false);
    if (threadId) {
      await postMessagingWebRtcSignal(
        accessToken,
        threadId,
        "screen",
        JSON.stringify({ sharing: false }),
        null,
      ).catch(() => undefined);
    }
  }

  async function toggleScreenShare(): Promise<void> {
    if (screenSharing) {
      await stopScreenShare();
      return;
    }
    if (callModeRef.current !== "video" || !localStreamRef.current) {
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }
      const local = localStreamRef.current;
      const cameraTrack = local.getVideoTracks().find(
        (t) => t !== screenTrackRef.current,
      );
      if (cameraTrack) {
        cameraVideoTrackRef.current = cameraTrack;
        local.removeTrack(cameraTrack);
      }
      screenTrackRef.current = screenTrack;
      screenTrack.onended = () => {
        void stopScreenShare();
      };
      local.addTrack(screenTrack);
      await replaceOutgoingVideoTrack(pcsRef.current.values(), screenTrack);
      setLocalStream(new MediaStream(local.getTracks()));
      setScreenSharing(true);
      setStatusLine("Ekran paylaşılıyor");
      if (threadId) {
        await postMessagingWebRtcSignal(
          accessToken,
          threadId,
          "screen",
          JSON.stringify({ sharing: true }),
          null,
        );
      }
    } catch {
      setStatusLine("Ekran paylaşımı iptal edildi");
    }
  }

  async function toggleHandRaise(): Promise<void> {
    if (!threadId) {
      return;
    }
    const next = !handRaised;
    setHandRaised(next);
    await postMessagingWebRtcSignal(
      accessToken,
      threadId,
      "raise",
      JSON.stringify({ raised: next }),
      null,
    ).catch(() => undefined);
  }

  async function sendQuickReaction(emoji: string): Promise<void> {
    if (!threadId) {
      return;
    }
    await postMessagingWebRtcSignal(
      accessToken,
      threadId,
      "reaction",
      JSON.stringify({ emoji }),
      null,
    ).catch(() => undefined);
  }

  async function copyMeetLink(): Promise<void> {
    if (!threadId || typeof window === "undefined") {
      return;
    }
    const url = buildMessagingMeetDeepLink(threadId);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setStatusLine("Bağlantı kopyalanamadı");
    }
  }

  async function archiveMeetRecordingBlob(
    blob: Blob,
    durationSeconds: number,
  ): Promise<void> {
    if (!threadId) {
      return;
    }
    try {
      let contentBase64: string | undefined;
      if (blob.size <= maxRecordingArchiveBytes) {
        contentBase64 = await blobToBase64(blob);
      }
      const archive = await postMessagingWebRtcRecordingArchive(
        accessToken,
        threadId,
        {
          durationSeconds,
          media: callModeRef.current,
          contentBase64,
          consentAcknowledged: recordingConsent || Boolean(contentBase64),
        },
      );
      setRecordingArchives((prev) => [archive, ...prev].slice(0, 12));
      setStatusLine(
        archive.hasBlob
          ? "Kayıt sunucu arşivine eklendi"
          : "Kayıt özeti arşivlendi (dosya boyutu limit üstü)",
      );
      void MessagingApiClient.sendMessage(
        accessToken,
        locale,
        threadId,
        `🎙️ Görüşme kaydı arşivi: ${formatCallDuration(durationSeconds)}${archive.hasBlob ? " (dosya)" : " (meta)"}`,
        undefined,
        "internal",
      ).catch(() => undefined);
    } catch {
      setStatusLine("Sunucu arşivi başarısız — yerel indirme kullanılabilir");
    }
  }

  async function stopMeetRecording(download: boolean): Promise<void> {
    const recorder = meetRecorderRef.current;
    if (!recorder) {
      return;
    }
    const startedAt = recordingStartedAtRef.current;
    meetRecorderRef.current = null;
    recordingStartedAtRef.current = null;
    setRecording(false);
    try {
      const blob = await recorder.stop();
      const durationSeconds = startedAt
        ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
        : Math.max(1, callSeconds);
      if (download) {
        downloadMeetRecordingBlob(blob);
      }
      await archiveMeetRecordingBlob(blob, durationSeconds);
    } catch {
      setStatusLine("Kayıt durdurulamadı");
    }
  }

  async function downloadArchivedRecording(archiveId: string): Promise<void> {
    if (!threadId) {
      return;
    }
    try {
      const { meta, contentBase64 } = await fetchMessagingWebRtcRecordingArchiveBlob(
        accessToken,
        threadId,
        archiveId,
      );
      if (!meta.hasBlob) {
        setStatusLine("Bu arşivde dosya yok (yalnızca özet)");
        return;
      }
      downloadArchiveWebmFromBase64(meta.filename, contentBase64);
    } catch {
      setStatusLine("Arşiv indirilemedi");
    }
  }

  async function toggleMeetRecording(): Promise<void> {
    if (recording) {
      await stopMeetRecording(true);
      return;
    }
    if (!recordingConsent) {
      setStatusLine("Kayıt için onay kutusunu işaretleyin");
      return;
    }
    const local = localStreamRef.current;
    if (!local) {
      return;
    }
    try {
      meetRecorderRef.current = startMeetLocalRecorder({
        localStream: local,
        remoteStreams: remotePeers.map((peer) => peer.stream),
        mode: callModeRef.current,
      });
      recordingStartedAtRef.current = Date.now();
      setRecording(true);
      setStatusLine(
        "Yerel kayıt — bitince indirilir ve küçük dosyalar arşivlenir",
      );
    } catch {
      setStatusLine("Kayıt başlatılamadı");
    }
  }

  async function saveMeetSchedule(): Promise<void> {
    if (!threadId || !scheduleAtLocal) {
      return;
    }
    setScheduleBusy(true);
    setError("");
    try {
      const scheduledAt = new Date(scheduleAtLocal).toISOString();
      const saved = await upsertMessagingWebRtcMeetSchedule(accessToken, threadId, {
        scheduledAt,
        media: scheduleMedia,
        note: scheduleNote.trim() || undefined,
      });
      setMeetSchedule(saved);
      setSchedulePanelOpen(false);
      setStatusLine(
        `Planlandı: ${formatMeetScheduleLocal(saved.scheduledAt, locale)}`,
      );
      void MessagingApiClient.sendMessage(
        accessToken,
        locale,
        threadId,
        `📅 Planlı görüşme: ${formatMeetScheduleLocal(saved.scheduledAt, locale)} (${saved.media === "audio" ? "sesli" : "görüntülü"})${saved.note ? ` — ${saved.note}` : ""}`,
        undefined,
        "internal",
      ).catch(() => undefined);
    } catch (err) {
      setError(formatWebRtcMediaError(err));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function cancelMeetSchedule(): Promise<void> {
    if (!threadId) {
      return;
    }
    setScheduleBusy(true);
    try {
      await clearMessagingWebRtcMeetSchedule(accessToken, threadId);
      setMeetSchedule(null);
      setSchedulePanelOpen(false);
      setStatusLine("Planlı görüşme iptal edildi");
    } catch {
      setStatusLine("Plan iptal edilemedi");
    } finally {
      setScheduleBusy(false);
    }
  }

  function openSchedulePanel(): void {
    setScheduleAtLocal(defaultDatetimeLocalValue());
    setScheduleMedia("video");
    setScheduleNote("");
    setSchedulePanelOpen(true);
  }

  function downloadScheduleIcs(): void {
    if (!threadId || !meetSchedule || typeof window === "undefined") {
      return;
    }
    const meetUrl = buildMessagingMeetDeepLink(threadId);
    downloadMeetIcsFile({
      scheduledAt: meetSchedule.scheduledAt,
      threadId,
      title: threadTitle?.trim() || "Lerta görüşme",
      meetUrl,
      note: meetSchedule.note,
    });
  }

  async function enterPictureInPicture(video: HTMLVideoElement | null): Promise<void> {
    if (!video || !document.pictureInPictureEnabled) {
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      /* kullanıcı iptal */
    }
  }

  async function endCall(): Promise<void> {
    const durationSec =
      callStartedAtRef.current
        ? Math.floor((Date.now() - callStartedAtRef.current) / 1000)
        : callSeconds;
    if (screenSharing) {
      await stopScreenShare().catch(() => undefined);
    }
    if (recording) {
      await stopMeetRecording(true).catch(() => undefined);
    }
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
    if (threadId && durationSec >= 5) {
      const listingHint = listingCard
        ? ` · ${listingCard.routeLabel}`
        : "";
      const modeLabel =
        callModeRef.current === "audio" ? "Sesli görüşme" : "Görüntülü görüşme";
      void MessagingApiClient.sendMessage(
        accessToken,
        locale,
        threadId,
        `📞 ${modeLabel} özeti: ${formatCallDuration(durationSec)}${listingHint}`,
        undefined,
        "internal",
      ).catch(() => undefined);
    }
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

  const sortedRemotes =
    layoutMode === "speaker" && activeSpeakerId
      ? [
          ...remotePeers.filter((p) => p.userId === activeSpeakerId),
          ...remotePeers.filter((p) => p.userId !== activeSpeakerId),
        ]
      : remotePeers;

  const localVideoClass = [
    "messaging-webrtc-pilot-video",
    "messaging-webrtc-pilot-video--local",
    videoEffect === "softBlur" ? "messaging-webrtc-video-effect--blur" : "",
    videoEffect === "lowLight" ? "messaging-webrtc-video-effect--lowlight" : "",
    activeSpeakerId === currentUserId ? "is-active-speaker" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showContextStrip =
    Boolean(threadTitle || listingCard) &&
    phase !== "idle" &&
    phase !== "ended";

  const scheduleAtMs = meetSchedule
    ? Date.parse(meetSchedule.scheduledAt)
    : Number.NaN;
  const showScheduleBanner =
    Boolean(meetSchedule) &&
    Number.isFinite(scheduleAtMs) &&
    scheduleAtMs > Date.now() - 15 * 60 * 1000;

  return (
    <div
      className="messaging-webrtc-pilot messaging-webrtc-meet-faz1 messaging-webrtc-meet-faz2 messaging-webrtc-meet-faz3 messaging-webrtc-meet-faz4 messaging-webrtc-meet-faz5 messaging-webrtc-meet-faz6 messaging-webrtc-meet-faz7 messaging-webrtc-meet-faz9 messaging-webrtc-meet-faz10"
      role="region"
      aria-label="Görüntülü ve sesli görüşme (en fazla 3 kişi)"
    >
      {isLikelyMobileBrowser() && (phase === "idle" || phase === "ended") ? (
        <p className="messaging-webrtc-faz10-mobile-hint" role="note">
          Mobil: görüşme için tarayıcıda bu sohbeti açık tutun; bildirimdeki bağlantı
          sizi doğrudan arama alanına getirir.
        </p>
      ) : null}
      {showContextStrip ? (
        <div className="messaging-webrtc-faz3-context" role="status">
          {threadTitle ? (
            <span className="messaging-webrtc-faz3-context-title">{threadTitle}</span>
          ) : null}
          {listingCard ? (
            <span className="messaging-webrtc-faz3-context-listing">
              {listingCard.routeLabel} · {listingCard.equipmentTypeCode} ·{" "}
              {listingCard.weightTonnes} t
              {listingCard.priceAmount
                ? ` · ${listingCard.priceAmount} ${listingCard.priceCurrencyCode ?? ""}`
                : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      {showScheduleBanner && meetSchedule ? (
        <div className="messaging-webrtc-faz4-schedule-banner" role="status">
          <span>
            Planlı görüşme:{" "}
            <strong>
              {formatMeetScheduleLocal(meetSchedule.scheduledAt, locale)}
            </strong>
            {" · "}
            {meetSchedule.media === "audio" ? "Sesli" : "Görüntülü"}
          </span>
          {phase === "idle" || phase === "ended" ? (
            <>
              <button
                type="button"
                className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--primary"
                onClick={() => void openPreCall(meetSchedule.media)}
              >
                Şimdi başlat
              </button>
              <button
                type="button"
                className="messaging-webrtc-pilot-btn"
                onClick={() => downloadScheduleIcs()}
              >
                Takvim (.ics)
              </button>
            </>
          ) : null}
        </div>
      ) : null}
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
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => void copyMeetLink()}
              title="Görüşme bağlantısı"
            >
              {linkCopied ? "Kopyalandı" : "Bağlantı"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => openSchedulePanel()}
            >
              Planla
            </button>
            {meetSchedule ? (
              <button
                type="button"
                className="messaging-webrtc-pilot-btn"
                onClick={() => void cancelMeetSchedule()}
                disabled={scheduleBusy}
              >
                Planı iptal
              </button>
            ) : null}
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
            {callModeRef.current === "video" ? (
              <button
                type="button"
                className={`messaging-webrtc-pilot-btn ${screenSharing ? "is-active" : ""}`}
                onClick={() => void toggleScreenShare()}
                title="Ekran paylaş"
              >
                {screenSharing ? "Ekranı durdur" : "Ekran"}
              </button>
            ) : null}
            <button
              type="button"
              className={`messaging-webrtc-pilot-btn ${handRaised ? "is-active" : ""}`}
              onClick={() => void toggleHandRaise()}
              title="El kaldır"
            >
              {handRaised ? "El indir" : "El kaldır"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => void copyMeetLink()}
              title="Görüşme bağlantısı"
            >
              {linkCopied ? "Kopyalandı" : "Bağlantı"}
            </button>
            <button
              type="button"
              className={`messaging-webrtc-pilot-btn ${recording ? "is-recording" : ""}`}
              onClick={() => void toggleMeetRecording()}
              title="Yerel kayıt (indir)"
            >
              {recording ? "Kaydı durdur" : "Kayıt"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() =>
                setLayoutMode((m) => (m === "grid" ? "speaker" : "grid"))
              }
              title="Görünüm"
            >
              {layoutMode === "grid" ? "Konuşmacı" : "Izgara"}
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() =>
                void enterPictureInPicture(
                  remotePeers[0]
                    ? (document.querySelector(
                        `[data-webrtc-peer="${remotePeers[0].userId}"]`,
                      ) as HTMLVideoElement | null)
                    : localVideoRef.current,
                )
              }
              title="Picture-in-Picture"
            >
              PiP
            </button>
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
        {inCallUi ? (
          <span
            className={`messaging-webrtc-network messaging-webrtc-network--${networkLevel}`}
            title={networkQualityLabel(networkLevel)}
          >
            {networkQualityLabel(networkLevel)}
          </span>
        ) : null}
        {recording ? (
          <span className="messaging-webrtc-faz4-recording-dot" aria-live="polite">
            REC
          </span>
        ) : null}
        <span
          className={`messaging-webrtc-faz4-ice ${iceCaps?.turnCredentialsConfigured ? "is-turn-ok" : "is-turn-warn"}`}
          title={iceCapsStatusLabel(iceCaps, turnMonitor)}
        >
          {iceCapsStatusLabel(iceCaps, turnMonitor)}
        </span>
        {recordingArchives.length > 0 ? (
          <button
            type="button"
            className="messaging-webrtc-faz5-archive-hint messaging-webrtc-faz7-archive-btn"
            onClick={() => setArchivePanelOpen((o) => !o)}
          >
            Arşiv: {recordingArchives.length}
          </button>
        ) : null}
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

      {schedulePanelOpen ? (
        <div className="messaging-webrtc-faz4-schedule-panel">
          <label>
            Tarih / saat
            <input
              type="datetime-local"
              value={scheduleAtLocal}
              onChange={(e) => setScheduleAtLocal(e.target.value)}
            />
          </label>
          <label>
            Tür
            <select
              value={scheduleMedia}
              onChange={(e) =>
                setScheduleMedia(e.target.value as CallMediaMode)
              }
            >
              <option value="video">Görüntülü</option>
              <option value="audio">Sesli</option>
            </select>
          </label>
          <label>
            Not
            <input
              type="text"
              value={scheduleNote}
              maxLength={240}
              placeholder="İsteğe bağlı"
              onChange={(e) => setScheduleNote(e.target.value)}
            />
          </label>
          <div className="messaging-webrtc-faz4-schedule-actions">
            <button
              type="button"
              className="messaging-webrtc-pilot-btn messaging-webrtc-pilot-btn--primary"
              disabled={scheduleBusy || !scheduleAtLocal}
              onClick={() => void saveMeetSchedule()}
            >
              Kaydet
            </button>
            <button
              type="button"
              className="messaging-webrtc-pilot-btn"
              onClick={() => setSchedulePanelOpen(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      ) : null}

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
              <label>
                Kalite
                <select
                  value={qualityProfile}
                  onChange={(e) =>
                    setQualityProfile(e.target.value as VideoQualityProfile)
                  }
                >
                  <option value="auto">Otomatik</option>
                  <option value="saver">Veri tasarrufu</option>
                  <option value="hd">HD</option>
                </select>
              </label>
              {preCallMode === "video" ? (
                <label>
                  Görüntü efekti
                  <select
                    value={videoEffect}
                    onChange={(e) =>
                      setVideoEffect(e.target.value as VideoEffect)
                    }
                  >
                    <option value="none">Yok</option>
                    <option value="softBlur">Yumuşak arka plan (beta)</option>
                    <option value="lowLight">Düşük ışık</option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <p className="messaging-webrtc-precall-hint">
            En fazla {MAX_PARTICIPANTS} kişi · {qualityProfileLabel(qualityProfile)} ·
            M/V/Esc
          </p>
        </div>
      ) : null}

      {inCallUi && callModeRef.current === "video" ? (
        <div className="messaging-webrtc-faz2-bar">
          <label className="messaging-webrtc-faz2-inline">
            Kalite
            <select
              value={qualityProfile}
              onChange={(e) =>
                setQualityProfile(e.target.value as VideoQualityProfile)
              }
            >
              <option value="auto">Otomatik</option>
              <option value="saver">Tasarruf</option>
              <option value="hd">HD</option>
            </select>
          </label>
          <label className="messaging-webrtc-faz2-inline">
            Efekt
            <select
              value={videoEffect}
              onChange={(e) => setVideoEffect(e.target.value as VideoEffect)}
            >
              <option value="none">Yok</option>
              <option value="softBlur">Blur β</option>
              <option value="lowLight">Işık+</option>
            </select>
          </label>
        </div>
      ) : null}

      {inCallUi ? (
        <label className="messaging-webrtc-faz7-consent">
          <input
            type="checkbox"
            checked={recordingConsent}
            onChange={(e) => setRecordingConsent(e.target.checked)}
          />
          Görüşme kaydı — katılımcıları bilgilendirdim (KVKK)
        </label>
      ) : null}

      {archivePanelOpen && recordingArchives.length > 0 ? (
        <ul className="messaging-webrtc-faz7-archive-list">
          {recordingArchives.map((row) => (
            <li key={row.id}>
              <span>
                {formatCallDuration(row.durationSeconds)} · {row.media} ·{" "}
                {row.hasBlob ? `${Math.round(row.byteSize / 1024)} KB` : "meta"}
              </span>
              {row.hasBlob ? (
                <button
                  type="button"
                  className="messaging-webrtc-pilot-btn"
                  onClick={() => void downloadArchivedRecording(row.id)}
                >
                  İndir
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {inCallUi ? (
        <div className="messaging-webrtc-faz3-reactions" aria-label="Tepkiler">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="messaging-webrtc-faz3-reaction-btn"
              onClick={() => void sendQuickReaction(emoji)}
              title="Tepki gönder"
            >
              {emoji}
            </button>
          ))}
          {raisedPeerIds.length > 0 || handRaised ? (
            <span className="messaging-webrtc-faz3-raised-hint">
              ✋{" "}
              {[
                ...(handRaised && currentUserId ? [currentUserId] : []),
                ...raisedPeerIds,
              ].length}{" "}
              el kaldırdı
            </span>
          ) : null}
        </div>
      ) : null}

      {showVideos || (inCallUi && remotePeers.length > 0) ? (
        <div
          className={
            layoutMode === "speaker"
              ? "messaging-webrtc-pilot-videos messaging-webrtc-pilot-videos--speaker"
              : "messaging-webrtc-pilot-videos messaging-webrtc-pilot-videos--mesh"
          }
        >
          {showVideos ? (
            <div className="messaging-webrtc-pilot-remote-wrap">
              <video
                ref={localVideoRef}
                className={localVideoClass}
                autoPlay
                muted
                playsInline
              />
              {handRaised ? (
                <span className="messaging-webrtc-hand-raise" aria-hidden>
                  ✋
                </span>
              ) : null}
            </div>
          ) : null}
          {sortedRemotes.map((peer, index) => (
            <div
              key={peer.userId}
              className="messaging-webrtc-pilot-remote-wrap"
            >
              <video
                data-webrtc-peer={peer.userId}
                className={
                  layoutMode === "speaker" && index === 0
                    ? "messaging-webrtc-pilot-video messaging-webrtc-pilot-video--remote messaging-webrtc-pilot-video--spotlight is-active-speaker"
                    : `messaging-webrtc-pilot-video messaging-webrtc-pilot-video--remote${
                        activeSpeakerId === peer.userId ? " is-active-speaker" : ""
                      }`
                }
                autoPlay
                playsInline
                ref={(el) => attachStreamToVideo(el, peer.stream)}
              />
              {raisedPeerIds.includes(peer.userId) ? (
                <span className="messaging-webrtc-hand-raise" aria-hidden>
                  ✋
                </span>
              ) : null}
              {peerReactions[peer.userId] ? (
                <span className="messaging-webrtc-reaction-pop">
                  {peerReactions[peer.userId]}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
