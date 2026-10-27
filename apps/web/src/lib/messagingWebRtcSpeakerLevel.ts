type AnalyserHandle = {
  stop: () => void;
  getLevel: () => number;
};

export function attachStreamLevelMeter(stream: MediaStream): AnalyserHandle {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  return {
    getLevel: () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (const v of data) {
        sum += v;
      }
      return sum / data.length;
    },
    stop: () => {
      source.disconnect();
      void audioContext.close();
    },
  };
}
