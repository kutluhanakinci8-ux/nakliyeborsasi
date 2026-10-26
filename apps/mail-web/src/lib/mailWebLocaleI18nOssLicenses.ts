export const MAIL_WEB_I18N_OSS_LICENSES_TR = {
  settingsHubOssLicenses: "Lisanslar",
  settingsHubOssLicensesSub: "Açık kaynak bileşenler",
  ossLicensesTitle: "Açık kaynak lisansları",
  ossLicensesIntro:
    "Lerta Posta, platform web ve mobil istemci için açık kaynak bileşenleri (W1–W9). Bir satıra dokunarak tam lisans metnini görüntüleyin.",
  ossLicensesBackToList: "Lisans listesi",
  ossLicensePackage: "Paket",
  ossLicenseVersion: "Sürüm",
  ossLicenseCopyright: "Telif",
  ossLicenseShort: "Lisans",
  ossLicenseHomepage: "Kaynak",
  helpOpenSourceLicenses: "Lisanslar",
  ossLicenseZstandardUsage:
    "Zstandard; birincil sıkıştırma — Posta API JSON (X-Lerta-Encoding: zstd), IndexedDB çevrimdışı önbellek ve mesaj detayları.",
  ossLicenseAddressFormattingUsage:
    "Address formatting (OpenCage); kurumsal posta adresi, giden e-posta dipnotu ve yol tarifi sorgularında uluslararası kısaltma ve satır düzeni.",
  ossLicenseZlibUsage:
    "zlib (gzip/DEFLATE); Zstd desteklemeyen istemciler için API yedek sıkıştırma (X-Lerta-Encoding: gzip), eDiscovery ZIP arşivleri ve ZIP CRC hesapları.",
  ossLicenseReactUsage:
    "React ve react-dom; posta arayüzü, ayarlar, gelen kutusu ve yazma ekranı bileşenleri.",
  ossLicenseNextUsage:
    "Next.js; web istemcisi çatısı, sayfa yönlendirme ve üretim derlemesi (@next/swc dahil).",
  ossLicenseOpenpgpUsage:
    "OpenPGP.js; istemci tarafında PGP şifreleme ve anahtar okuma (kurumsal güvenli posta).",
  ossLicenseSimpleWebAuthnUsage:
    "SimpleWebAuthn; passkey ve biyometrik giriş (WebAuthn) tarayıcı istemcisi.",
  ossLicenseBrotliUsage:
    "Brotli; Zstd yüklenemezse API JSON sıkıştırması (X-Lerta-Encoding: br) ve yanıt zarfı açma.",
  ossLicenseLibPhoneNumberUsage:
    "libphonenumber-js; kurumsal kişilerde telefon doğrulama, E.164 saklama ve uluslararası gösterim.",
  ossLicenseUtf7ImapUsage:
    "utf7 (IMAP modified UTF-7); özel klasör adlarının IMAP LIST biçimi ve maildir iskeleti.",
  ossLicenseDompurifyUsage:
    "DOMPurify; gelen ve giden posta HTML sanitizasyonu (API) ve mesaj okuma görünümü (istemci).",
  ossLicenseWebPushUsage:
    "web-push (sunucu); tarayıcı push bildirimleri — posta ve mesajlaşma uyarıları. Tarayıcıya indirilmez.",
  ossLicenseWsUsage:
    "ws (sunucu); mesajlaşma canlı WebSocket hub. Tarayıcıya indirilmez.",
  ossLicenseNodemailerUsage:
    "Nodemailer (sunucu); kurumsal giden e-posta SMTP gönderimi. Tarayıcıya indirilmez.",
  ossLicenseZstdNodeApiUsage:
    "Zstandard (sunucu); Posta API JSON sıkıştırma (X-Lerta-Encoding: zstd). Tarayıcıya indirilmez.",
  ossLicenseLeafletUsage:
    "Leaflet (app.lerta.com.tr); canlı filo haritası ve konum görselleştirme — mesajlaşma/lojistik hub.",
  ossLicenseExpoUsage:
    "Expo (mobil); React Native çatısı, posta ve mesajlaşma mobil istemci iskeleti.",
  ossLicenseReactNativeUsage:
    "React Native (mobil); iOS/Android kullanıcı arayüzü.",
  ossLicenseExpoAuthSessionUsage:
    "expo-auth-session (AppAuth); kurumsal OAuth / giriş akışı (mobil).",
  ossLicenseExpoNotificationsUsage:
    "expo-notifications (mobil); Firebase Cloud Messaging (Android) ve APNs (iOS) üzerinden push bildirim token kaydı.",
  ossLicenseSharpUsage:
    "sharp / libvips (sunucu); gelen posta eklerinde küçük JPEG önizleme (libjpeg-turbo vb.). Tarayıcıya indirilmez.",
  ossLicenseBrowserWebRtcUsage:
    "WebRTC (tarayıcı); gelecek görüntülü görüşme için RTCPeerConnection / getUserMedia. libvpx, libwebm ve codec'ler kullanıcı tarayıcısında — Lerta paketiyle dağıtılmaz.",
  ossLicenseOkhttpAndroidUsage:
    "OkHttp (Android native); RN/Expo Android derlemesinde ağ katmanı bağımlılığı — npm SBOM’da listelenmez.",
  ossLicenseLibvpxNativeUsage:
    "libvpx / libwebm (mobil native WebRTC); OS veya native SDK ile gelir — gelecek görüntülü görüşme fazı.",
} as const;

export const MAIL_WEB_I18N_OSS_LICENSES_EN = {
  settingsHubOssLicenses: "Licenses",
  settingsHubOssLicensesSub: "Open-source components",
  ossLicensesTitle: "Open source licenses",
  ossLicensesIntro:
    "Open-source components for Lerta Posta, the platform web app, and the mobile client (W1–W9). Tap a row to view the full license text.",
  ossLicensesBackToList: "License list",
  ossLicensePackage: "Package",
  ossLicenseVersion: "Version",
  ossLicenseCopyright: "Copyright",
  ossLicenseShort: "License",
  ossLicenseHomepage: "Source",
  helpOpenSourceLicenses: "Licenses",
  ossLicenseZstandardUsage:
    "Zstandard is the primary codec for Posta API JSON (X-Lerta-Encoding: zstd) and compressed IndexedDB offline cache.",
  ossLicenseAddressFormattingUsage:
    "Address formatting (OpenCage); corporate postal address, outbound footer, and directions queries with international abbreviations.",
  ossLicenseZlibUsage:
    "zlib (gzip/DEFLATE) provides API fallback compression (X-Lerta-Encoding: gzip), eDiscovery ZIP exports, and ZIP CRC checks.",
  ossLicenseReactUsage:
    "React and react-dom power the mail UI, settings, inbox, and compose surfaces.",
  ossLicenseNextUsage:
    "Next.js is the web client framework (routing, production build, @next/swc).",
  ossLicenseOpenpgpUsage:
    "OpenPGP.js provides client-side PGP encryption and key handling.",
  ossLicenseSimpleWebAuthnUsage:
    "SimpleWebAuthn enables passkeys and biometric sign-in in the browser.",
  ossLicenseBrotliUsage:
    "Brotli is the second-choice API JSON codec (X-Lerta-Encoding: br) when Zstd is unavailable.",
  ossLicenseLibPhoneNumberUsage:
    "libphonenumber-js validates org contacts, stores E.164, and formats numbers for display.",
  ossLicenseUtf7ImapUsage:
    "utf7 (IMAP modified UTF-7) encodes custom folder names for IMAP LIST and maildir layout.",
  ossLicenseDompurifyUsage:
    "DOMPurify sanitizes inbound/outbound mail HTML on the API and mail read view in the browser.",
  ossLicenseWebPushUsage:
    "web-push (server) sends browser push notifications for mail and messaging. Not shipped to the browser bundle.",
  ossLicenseWsUsage:
    "ws (server) powers the messaging WebSocket hub. Not shipped to the browser bundle.",
  ossLicenseNodemailerUsage:
    "Nodemailer (server) sends outbound corporate mail over SMTP. Not shipped to the browser bundle.",
  ossLicenseZstdNodeApiUsage:
    "Zstandard on the server compresses Posta API JSON (X-Lerta-Encoding: zstd). Not shipped to the browser bundle.",
  ossLicenseLeafletUsage:
    "Leaflet (app.lerta.com.tr) powers the live fleet map and location views in the messaging/logistics hub.",
  ossLicenseExpoUsage:
    "Expo powers the mobile React Native shell for mail and messaging.",
  ossLicenseReactNativeUsage:
    "React Native provides the iOS/Android UI layer.",
  ossLicenseExpoAuthSessionUsage:
    "expo-auth-session (AppAuth) handles mobile OAuth sign-in flows.",
  ossLicenseExpoNotificationsUsage:
    "expo-notifications registers mobile push tokens via FCM (Android) and APNs (iOS).",
  ossLicenseSharpUsage:
    "sharp / libvips (server) generates small JPEG previews for inbound mail image attachments. Not shipped to the browser bundle.",
  ossLicenseBrowserWebRtcUsage:
    "Browser WebRTC for future video calling (RTCPeerConnection / getUserMedia). Codecs such as libvpx and libwebm ship with the user's browser, not with Lerta packages.",
  ossLicenseOkhttpAndroidUsage:
    "OkHttp on Android (native Gradle dependency for RN/Expo builds; not in the npm SBOM).",
  ossLicenseLibvpxNativeUsage:
    "libvpx / libwebm for future native mobile WebRTC — shipped with OS or native SDK, not npm.",
} as const;
