export function readUserIdFromAccessToken(accessToken: string): string | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob !== "function") {
      return null;
    }
    const json = atob(padded);
    const payload = JSON.parse(json) as { sub?: string; userId?: string };
    if (typeof payload.sub === "string") {
      return payload.sub;
    }
    if (typeof payload.userId === "string") {
      return payload.userId;
    }
    return null;
  } catch {
    return null;
  }
}
