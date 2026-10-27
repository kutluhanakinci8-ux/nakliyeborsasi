let ringTimer: ReturnType<typeof setInterval> | null = null;

function beep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, 180);
  } catch {
    /* sessiz */
  }
}

export function startMeetIncomingRing(): void {
  stopMeetIncomingRing();
  beep();
  ringTimer = setInterval(() => beep(), 2200);
}

export function stopMeetIncomingRing(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}
