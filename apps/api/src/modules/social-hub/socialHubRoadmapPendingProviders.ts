export const ROADMAP_PENDING_SKELETON_PLATFORM_CODES = [
  "GOOGLE_BUSINESS",
] as const;

export type RoadmapPendingSkeletonPlatformCode =
  (typeof ROADMAP_PENDING_SKELETON_PLATFORM_CODES)[number];

export function isRoadmapPendingSkeletonPlatform(platformCode: string): boolean {
  const code = platformCode.trim().toUpperCase();
  return (ROADMAP_PENDING_SKELETON_PLATFORM_CODES as readonly string[]).includes(
    code,
  );
}
