/** API auth/register ve login hata metinlerini Türkçe kullanıcı mesajına çevirir. */
export function formatRegisterApiError(responseText: string): string {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return "Kayıt tamamlanamadı. Lütfen tekrar deneyin.";
  }
  try {
    const payload = JSON.parse(trimmed) as {
      message?: string | string[];
      errorCode?: string;
    };
    const raw = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message ?? "";
    const msg = raw.toLowerCase();

    if (msg.includes("already registered") || msg.includes("email address is already")) {
      return "Bu giriş e-postası sistemde kayıtlı. Zaten hesabınız varsa «Giriş yap» kullanın; yeni bir firma için farklı bir giriş e-postası girin.";
    }
    if (msg.includes("unknown subscription plan")) {
      return "Seçilen plan geçersiz. Sayfayı yenileyip tekrar deneyin veya destek@lerta.com.tr.";
    }
    if (raw) {
      return raw;
    }
  } catch {
    /* plain text */
  }
  if (trimmed.toLowerCase().includes("already registered")) {
    return "Bu giriş e-postası sistemde kayıtlı. «Giriş yap» ile devam edin.";
  }
  return "Kayıt tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}

export function isEmailAlreadyRegisteredMessage(message: string): boolean {
  return message.includes("giriş e-postası sistemde kayıtlı");
}
