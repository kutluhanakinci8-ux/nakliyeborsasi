export type MeetLocalRecorder = {
  stop: () => Promise<Blob>;
};

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function attachHiddenVideo(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  void video.play().catch(() => undefined);
  return video;
}

export function startMeetLocalRecorder(params: {
  localStream: MediaStream;
  remoteStreams: MediaStream[];
  mode: "audio" | "video";
}): MeetLocalRecorder {
  const audioContext = new AudioContext();
  const audioDest = audioContext.createMediaStreamDestination();
  const mixStream = (stream: MediaStream) => {
    for (const track of stream.getAudioTracks()) {
      const source = audioContext.createMediaStreamSource(new MediaStream([track]));
      source.connect(audioDest);
    }
  };
  mixStream(params.localStream);
  for (const remote of params.remoteStreams) {
    mixStream(remote);
  }

  let outputStream: MediaStream;
  let rafId = 0;
  let canvas: HTMLCanvasElement | null = null;
  const videos: HTMLVideoElement[] = [];

  if (params.mode === "video") {
    canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    videos.push(attachHiddenVideo(params.localStream));
    for (const remote of params.remoteStreams) {
      videos.push(attachHiddenVideo(remote));
    }
    const draw = () => {
      if (!ctx || !canvas) {
        return;
      }
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cols = videos.length <= 1 ? 1 : videos.length <= 2 ? 2 : 2;
      const rows = Math.ceil(videos.length / cols);
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;
      videos.forEach((video, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellW;
        const y = row * cellH;
        if (video.readyState >= 2) {
          ctx.drawImage(video, x, y, cellW, cellH);
        }
      });
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    const canvasTrack = canvas.captureStream(12).getVideoTracks()[0];
    outputStream = new MediaStream([
      canvasTrack,
      ...audioDest.stream.getAudioTracks(),
    ]);
  } else {
    outputStream = audioDest.stream;
  }

  const mimeType = pickRecorderMime();
  const recorder = new MediaRecorder(
    outputStream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  recorder.start(1000);

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          cancelAnimationFrame(rafId);
          for (const video of videos) {
            video.srcObject = null;
          }
          void audioContext.close();
          resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        };
        recorder.onerror = () => {
          reject(new Error("recorder"));
        };
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }),
  };
}

export function downloadMeetRecordingBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lerta-gorusme-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
  anchor.click();
  URL.revokeObjectURL(url);
}
