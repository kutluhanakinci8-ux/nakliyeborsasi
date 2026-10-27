/** STT-OSS-4: process-wide concurrent STT slot limiter (API instance). */

let active = 0;

export function messagingVoiceSttActiveCount(): number {
  return active;
}

export async function withMessagingVoiceSttSlot<T>(
  maxConcurrent: number,
  work: () => Promise<T>,
): Promise<T | "stt-busy"> {
  const max = Number.isFinite(maxConcurrent) && maxConcurrent > 0
    ? Math.floor(maxConcurrent)
    : 0;
  if (max === 0) {
    return work();
  }
  if (active >= max) {
    return "stt-busy";
  }
  active += 1;
  try {
    return await work();
  } finally {
    active = Math.max(0, active - 1);
  }
}
