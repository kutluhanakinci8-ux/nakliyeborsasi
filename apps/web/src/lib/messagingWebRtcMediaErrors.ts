export function formatWebRtcMediaError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Kamera/mikrofon izni reddedildi. Safari adres çubuğundan izin verin ve tekrar deneyin.";
    }
    if (error.name === "NotFoundError") {
      return "Kamera veya mikrofon bulunamadı.";
    }
    if (error.name === "NotReadableError") {
      return "Kamera/mikrofon başka bir uygulama tarafından kullanılıyor.";
    }
    if (error.name === "SecurityError") {
      return "Tarayıcı bu sayfada medya erişimine izin vermiyor (HTTPS ve kullanıcı onayı gerekir).";
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes("Görüntülü görüşme dolu")) {
      return error.message;
    }
    return error.message;
  }
  return "Medya veya arama hatası";
}
