export function formatAuctionCountdownTr(endsAt: string, nowMs: number): string {
  const endMs = new Date(endsAt).getTime();
  const diffMs = endMs - nowMs;
  if (diffMs <= 0) {
    return "Süre doldu";
  }
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return `${days} g ${hours} s ${minutes} dk`;
  }
  if (hours > 0) {
    return `${hours} s ${minutes} dk ${seconds} sn`;
  }
  return `${minutes} dk ${seconds} sn`;
}

export function isAuctionEndingSoon(endsAt: string, nowMs: number): boolean {
  const endMs = new Date(endsAt).getTime();
  const diffMs = endMs - nowMs;
  return diffMs > 0 && diffMs <= 3 * 60 * 1000;
}
