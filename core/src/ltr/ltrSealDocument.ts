import {
  LTR_MANIFEST_SCRIPT_ID,
  LTR_MANIFEST_SCRIPT_TYPE,
  LTR_META_VERSION,
  LTR_SCHEMA_ID,
} from "./ltrConstants";
import type { LtrManifest } from "./ltrManifestTypes";
import { renderLtrDocumentHtml } from "./ltrRenderBlocksHtml";

/** Mühürlü `.ltr` HTML — manifest script + görüntülenen gövde (WinLRT extract uyumlu). */
export function sealLtrDocumentHtml(manifest: LtrManifest): string {
  const validatedJson = JSON.stringify(manifest);
  const safeJson = validatedJson.replace(/</g, "\\u003c");
  const doc = renderLtrDocumentHtml(manifest);
  const script = `<script type="${LTR_MANIFEST_SCRIPT_TYPE}" id="${LTR_MANIFEST_SCRIPT_ID}">${safeJson}</script>`;
  const metaLtr = `<meta name="ltr" content="${LTR_META_VERSION}">`;
  if (doc.includes('name="ltr"')) {
    return doc.replace("</head>", `${script}\n</head>`);
  }
  return doc.replace("<head>", `<head>\n${metaLtr}\n`).replace("</head>", `${script}\n</head>`);
}

export function sealLtrDocumentBytes(manifest: LtrManifest): Uint8Array {
  return new TextEncoder().encode(sealLtrDocumentHtml(manifest));
}
