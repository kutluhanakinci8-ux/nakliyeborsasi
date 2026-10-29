import type { LtrDistributionMode } from "./ltrConstants";

export type LtrManifestMeta = {
  author?: string;
  organization?: string;
  createdAt?: string;
  generator?: string;
};

/** Blok türüne göre ek alanlar (callout.tone, markdown.md, …) serbest. */
export type LtrBlockBase = {
  type: string;
  [key: string]: unknown;
};

export type LtrManifest = {
  schema: string;
  lang: string;
  mode: LtrDistributionMode;
  title: string;
  subtitle?: string;
  meta?: LtrManifestMeta;
  blocks: LtrBlockBase[];
};
