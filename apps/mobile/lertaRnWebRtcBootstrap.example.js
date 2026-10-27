/**
 * Dev client entry (örnek): index.js içinde en üste ekleyin.
 * @see docs/messaging/WEBRTC-RN-WEBRTC-DEV-CLIENT.md
 */
import { RTCPeerConnection, RTCView, mediaDevices } from "react-native-webrtc";

global.LertaRnWebRTC = {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
};
