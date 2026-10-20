/** Platform vitrin (www / kurumsal cutover) — posta login ile aynı host. */
export const VITRIN_BASE_URL =
  process.env.NEXT_PUBLIC_VITRIN_URL?.replace(/\/$/, "") ??
  "https://www.lerta.com.tr";

export function vitrinPath(path: string): string {
  return `${VITRIN_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
