/** Tek satır JSON log (Loki / CloudWatch / grep dostu). */
export function formatMessagingStructuredLog(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
): string {
  const payload: Record<string, string | number | boolean> = {
    component: "messaging",
    event,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      continue;
    }
    payload[key] = value;
  }
  return JSON.stringify(payload);
}
