import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Faz W8 — görüntülü görüşme: tarayıcı WebRTC (codec'ler kullanıcı agent'ta). */
export const MAIL_WEB_W8_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "browser-webrtc",
    sortName: "WebRTC (tarayıcı)",
    packageName: "W3C WebRTC · kullanıcı tarayıcısı",
    version: "UA",
    copyright:
      "WebRTC implementation and codecs (e.g. libvpx, libwebm) ship with the user's browser or OS, not with Lerta.",
    licenseShort: "Browser / third-party",
    homepage: "https://www.w3.org/TR/webrtc/",
    usageNoteKey: "ossLicenseBrowserWebRtcUsage",
    licenseText: `WebRTC disclosure (W8)

Lerta messaging may use the browser's built-in RTCPeerConnection and getUserMedia APIs for future
video calling. Video/audio codecs (libvpx, libwebm, dav1d, libaom, libSRTP, etc.) are provided by
the end-user's browser or operating system. They are not bundled in the Lerta web or API packages.

See your browser vendor's open-source notices for codec licenses.`,
  },
];
