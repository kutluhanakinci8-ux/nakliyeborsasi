declare module "zstd-codec" {
  export const ZstdCodec: {
    run: (
      fn: (zstd: {
        Simple: new () => {
          compress(content: Uint8Array, level?: number): Uint8Array;
        };
      }) => void,
    ) => void;
  };
}
