export {
  clientRequestedZstd,
  isGzipBase64Envelope,
  isZstdBase64Envelope,
  maybeCompressJsonEnvelope,
  maybeZstdJsonEnvelope,
  parseClientLertaEncoding,
} from "./mailJsonCompressionHttp.util";
export type { LertaJsonCompression } from "./mailJsonCompressionHttp.util";
