/** Tarayıcıda Zstandard sıkıştırma (zstd-codec / Emscripten). Açma: fzstd. */
type ZstdSimple = {
  compress(content: Uint8Array, level?: number): Uint8Array;
};

let simplePromise: Promise<ZstdSimple> | null = null;

function loadSimpleCodec(): Promise<ZstdSimple> {
  if (!simplePromise) {
    simplePromise = new Promise((resolve, reject) => {
      import("zstd-codec")
        .then((mod) => {
          const ZstdCodec = mod.ZstdCodec as {
            run: (fn: (zstd: { Simple: new () => ZstdSimple }) => void) => void;
          };
          ZstdCodec.run((zstd) => {
            resolve(new zstd.Simple());
          });
        })
        .catch(reject);
    });
  }
  return simplePromise;
}

export async function compressBytesWithZstd(
  bytes: Uint8Array,
  level = 3,
): Promise<Uint8Array> {
  const simple = await loadSimpleCodec();
  return simple.compress(bytes, level);
}
