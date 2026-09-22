export const INSTAGRAM_STATS_MESSAGE_TYPE = "nb-instagram-stats";

export type InstagramStatsCaptureMessage = {
  type: typeof INSTAGRAM_STATS_MESSAGE_TYPE;
  followers: string;
  following: string;
  posts: string;
};

const INSTAGRAM_ORIGINS = new Set([
  "https://www.instagram.com",
  "https://instagram.com",
]);

export function isInstagramStatsCaptureMessage(
  data: unknown,
): data is InstagramStatsCaptureMessage {
  if (!data || typeof data !== "object") {
    return false;
  }
  const payload = data as InstagramStatsCaptureMessage;
  return payload.type === INSTAGRAM_STATS_MESSAGE_TYPE;
}

export function isTrustedInstagramMessageOrigin(origin: string): boolean {
  return INSTAGRAM_ORIGINS.has(origin);
}

export function normalizeInstagramCountLabel(raw: string): string {
  return raw.replace(/,/g, "").replace(/\s+/g, " ").trim();
}

export function openInstagramProfileForCapture(profileUrl: string): void {
  const trimmed = profileUrl.trim();
  if (!trimmed) {
    return;
  }
  const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  window.open(url, "nb_instagram_capture", "width=520,height=920");
}

export function buildInstagramCaptureBookmarkletHref(adminOrigin: string): string {
  const targetOrigin = adminOrigin.replace(/'/g, "");
  const script = `(function(){try{var m=document.querySelector('meta[property="og:description"]')||document.querySelector('meta[name="description"]');var c=m&&m.content?m.content:'';var p=c.match(/([\\d,.]+)\\s+(?:Followers?|Takipçi),?\\s*([\\d,.]+)\\s+(?:Following|Takip),?\\s*([\\d,.]+)\\s+(?:Posts?|Gönderi)/i);if(!p){alert('Takipçi/gönderi metni bulunamadı. Firma profil sayfasında olduğunuzdan ve Instagram\\'a giriş yaptığınızdan emin olun.');return;}var payload={type:'${INSTAGRAM_STATS_MESSAGE_TYPE}',followers:p[1],following:p[2],posts:p[3]};if(window.opener&&!window.opener.closed){window.opener.postMessage(payload,'${targetOrigin}');alert('Sayılar Nakliye Borsası admin paneline gönderildi. Panele dönüp Kaydet deyin.');}else{prompt('Opener yok — JSON kopyalayın:',JSON.stringify(payload));}}catch(e){alert(e);}})();`;
  return `javascript:${encodeURIComponent(script)}`;
}
