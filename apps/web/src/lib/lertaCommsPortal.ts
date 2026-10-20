/** Mesaj + giriş — lojistikten bağımsız; tek giriş: u88.lerta.com.tr */
export const LERTA_COMMS_PORTAL_HOST = "u88.lerta.com.tr";

export function isLertaCommsPortalHost(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }
  const normalized = hostname.toLowerCase().split(":")[0];
  return (
    normalized === LERTA_COMMS_PORTAL_HOST ||
    normalized === `www.${LERTA_COMMS_PORTAL_HOST}`
  );
}

export function resolvePostLoginPath(
  isCommsPortal: boolean,
  nextPath: string | null | undefined,
): string {
  if (isCommsPortal) {
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      return nextPath;
    }
    return "/messaging?tab=sohbet";
  }
  return "/marketplace";
}
