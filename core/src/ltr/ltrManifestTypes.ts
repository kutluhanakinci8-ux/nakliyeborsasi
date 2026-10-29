import type { LtrDistributionMode } from "./ltrConstants";

export type LtrManifestMeta = {
  author?: string;
  organization?: string;
  createdAt?: string;
  generator?: string;
};

export type LtrBlockBase = {
  type: string;
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
