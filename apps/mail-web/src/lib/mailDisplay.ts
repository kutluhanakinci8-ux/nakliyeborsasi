/** Gelen kutusu liste satırı — gönderen ve tarih gösterimi */

export function mailSenderLabel(fromAddress: string): string {
  const angle = fromAddress.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return angle[1].replace(/^["']|["']$/g, "").trim();
  }
  const at = fromAddress.indexOf("@");
  if (at > 0) {
    return fromAddress.slice(0, at);
  }
  return fromAddress;
}

export function mailSenderInitials(fromAddress: string): string {
  const label = mailSenderLabel(fromAddress);
  const parts = label.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (label.length >= 2) {
    return label.slice(0, 2).toUpperCase();
  }
  return label.slice(0, 1).toUpperCase() || "?";
}

export function formatMailListDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sameCalendarDay = startToday.getTime() === startThat.getTime();
  if (sameCalendarDay) {
    return d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}
