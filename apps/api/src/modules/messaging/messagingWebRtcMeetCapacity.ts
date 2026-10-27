import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";

export type MessagingWebRtcMeetCapacitySnapshot = {
  topology: "mesh_p2p";
  meshMaxParticipants: number;
  sfuMode: "disabled";
  sfuMaxParticipants: number;
  effectiveMaxParticipants: number;
  overflowPolicy: "reject_join";
  overflowHintTr: string;
  sfuRoadmapHintTr: string;
};

export function summarizeMessagingWebRtcMeetCapacity(): MessagingWebRtcMeetCapacitySnapshot {
  const meshMax = MESSAGING_WEBRTC_MAX_PARTICIPANTS;
  return {
    topology: "mesh_p2p",
    meshMaxParticipants: meshMax,
    sfuMode: "disabled",
    sfuMaxParticipants: 0,
    effectiveMaxParticipants: meshMax,
    overflowPolicy: "reject_join",
    overflowHintTr:
      `Görüntülü görüşme dolu (en fazla ${meshMax} kişi, P2P mesh). Bir katılımcı ayrıldığında tekrar deneyin.`,
    sfuRoadmapHintTr:
      "4+ kişi için SFU modu henüz kapalı; ürün yol haritasında (Faz 16+).",
  };
}
