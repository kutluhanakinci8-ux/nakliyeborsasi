/** LTR (Lerta Document) format sabitleri — spec v1.0 iskelet */
export const LTR_FILE_EXTENSION = ".ltr" as const;

export const LTR_SCHEMA_ID = "lerta/ltr/1.0" as const;

export const LTR_META_VERSION = "1.0" as const;

export const LTR_MIME_SEALED_HTML =
  "application/vnd.lerta.document+html" as const;

export const LTR_MANIFEST_SCRIPT_ID = "ltr-content" as const;

export const LTR_MANIFEST_SCRIPT_TYPE = "application/ltr+json" as const;

export const LTR_MODES = ["sealed", "linked"] as const;

export type LtrDistributionMode = (typeof LTR_MODES)[number];

/** Mühürlü tek dosya üst boyut (F1 QA) — bayt */
export const LTR_SEALED_MAX_BYTES_DEFAULT = 5 * 1024 * 1024;
