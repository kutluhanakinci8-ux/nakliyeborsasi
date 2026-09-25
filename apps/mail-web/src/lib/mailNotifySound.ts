const STORAGE_KEY = "lerta-mail-notify-sound";

export function isMailNotifySoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMailNotifySoundEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

export function playMailNotifyBeep(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    void ctx.close();
  } catch {
    /* ses opsiyonel */
  }
}
