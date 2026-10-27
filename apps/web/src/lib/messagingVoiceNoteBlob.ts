export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

export function pickVoiceNoteMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }
  if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
    return "audio/ogg;codecs=opus";
  }
  return "audio/webm";
}

export function voiceNoteFilenameForMime(mime: string): string {
  if (mime.includes("ogg")) {
    return `sesli-mesaj-${Date.now()}.ogg`;
  }
  return `sesli-mesaj-${Date.now()}.webm`;
}
