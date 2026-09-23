export function isSecureGeolocationContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.isSecureContext) {
    return true;
  }
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function geolocationBlockedReason(): string | null {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return "Bu tarayıcı konum API desteklemiyor.";
  }
  if (!isSecureGeolocationContext()) {
    return (
      "iPhone Safari konumu yalnızca HTTPS adresinde çalışır. " +
      "http://IP:3011 ile «Origin does not have permission…» hatası normaldir. " +
      "Şoför telemetri için https://168.231.109.27 adresini kullanın " +
      "(ilk açılışta sertifikayı onaylayın) veya kurumsal alan adınızı HTTPS ile bağlayın."
    );
  }
  return null;
}
