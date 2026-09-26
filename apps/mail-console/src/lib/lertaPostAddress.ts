/** örn. abayer.com → info@abayer.post */
export function suggestLertaPostMailbox(
  customDomain: string | null,
  localPart = "info",
): string | null {
  if (!customDomain?.trim()) {
    return null;
  }
  const host = customDomain.trim().toLowerCase().replace(/\.$/, "");
  const slug = host.split(".")[0];
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return null;
  }
  const part = localPart.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(part)) {
    return null;
  }
  return `${part}@${slug}.post`;
}
