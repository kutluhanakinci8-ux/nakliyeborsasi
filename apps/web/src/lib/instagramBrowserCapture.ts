export const INSTAGRAM_STATS_MESSAGE_TYPE = "nb-instagram-stats";

export type InstagramStatsCaptureMessage = {
  type: typeof INSTAGRAM_STATS_MESSAGE_TYPE;
  followers: string;
  following: string;
  posts: string;
};

export type ParsedInstagramStats = {
  posts: string;
  followers: string;
  following: string;
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

/** Profil sayfasındaki görünen metinden (TR/EN) sayıları çıkarır */
export function parseInstagramStatsFromText(text: string): ParsedInstagramStats | null {
  const normalized = text.replace(/\u00a0/g, " ").replace(/\s+/g, " ");

  let posts =
    normalized.match(/([\d,.]+(?:\s*[BbKkMm])?)\s*gönderi/i)?.[1] ??
    normalized.match(/([\d,.]+(?:\s*[KkMm])?)\s+posts?/i)?.[1];
  let followers =
    normalized.match(/([\d,.]+(?:\s*[BbKkMmİ])?)\s*takipçi/i)?.[1] ??
    normalized.match(/([\d,.]+(?:\s*[KkMm])?)\s+followers?/i)?.[1];
  let following =
    normalized.match(/([\d,.]+(?:\s*[BbKkMm])?)\s*takip(?!çi)/i)?.[1] ??
    normalized.match(/([\d,.]+(?:\s*[KkMm])?)\s+following/i)?.[1];

  const og = normalized.match(
    /([\d,.]+)\s+followers?,?\s*([\d,.]+)\s+following,?\s*([\d,.]+)\s+posts?/i,
  );
  if (og) {
    followers = followers ?? og[1];
    following = following ?? og[2];
    posts = posts ?? og[3];
  }

  if (!posts && !followers && !following) {
    return null;
  }

  return {
    posts: (posts ?? "").trim(),
    followers: (followers ?? "").trim(),
    following: (following ?? "").trim(),
  };
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
  const script = `(function(){try{var t=document.body.innerText||'';var n=t.replace(/\\u00a0/g,' ').replace(/\\s+/g,' ');function g(){var posts=n.match(/([\\d,.]+(?:\\s*[BbKkMm])?)\\s*gönderi/i)||n.match(/([\\d,.]+(?:\\s*[KkMm])?)\\s+posts?/i);var fol=n.match(/([\\d,.]+(?:\\s*[BbKkMmİ])?)\\s*takipçi/i)||n.match(/([\\d,.]+(?:\\s*[KkMm])?)\\s+followers?/i);var folw=n.match(/([\\d,.]+(?:\\s*[BbKkMm])?)\\s*takip(?!çi)/i)||n.match(/([\\d,.]+(?:\\s*[KkMm])?)\\s+following/i);var m=document.querySelector('meta[property="og:description"]');if(m&&m.content){var og=m.content.match(/([\\d,.]+)\\s+Followers?,?\\s*([\\d,.]+)\\s+Following,?\\s*([\\d,.]+)\\s+Posts?/i);if(og){return{followers:og[1],following:og[2],posts:og[3]};}}if(!posts&&!fol){alert('Sayılar bulunamadı. Profil sayfasında (208 gönderi / takipçi satırı görünür) olduğunuzdan emin olun.');return null;}return{posts:posts?posts[1]:'',followers:fol?fol[1]:'',following:folw?folw[1]:''};}var r=g();if(!r)return;var payload={type:'${INSTAGRAM_STATS_MESSAGE_TYPE}',followers:r.followers,following:r.following,posts:r.posts};if(window.opener&&!window.opener.closed){window.opener.postMessage(payload,'${targetOrigin}');alert('Okundu: '+r.posts+' gönderi, '+r.followers+' takipçi. Admin panele dönüp Kaydet deyin.');}else{prompt('Admin paneli bu sekmeden açılmadı. JSON kopyalayıp panele yapıştırın:',JSON.stringify(payload));}}catch(e){alert(e);}})();`;
  return `javascript:${encodeURIComponent(script)}`;
}
