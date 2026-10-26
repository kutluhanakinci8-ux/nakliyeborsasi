import type { InboxFocusLane } from "@/lib/mailInboxFocus";
import type { InboxQueryFilterId } from "@/lib/mailInboxListFilters";

const LANE_KEY = "lerta-mail-inbox-focus-lane";
const FILTERS_KEY = "lerta-mail-inbox-query-filters";
const USER_CATEGORY_FILTERS_KEY = "lerta-mail-inbox-user-category-filters";

export function readStoredInboxFocusLane(): InboxFocusLane {
  if (typeof window === "undefined") {
    return "focus";
  }
  try {
    const raw = localStorage.getItem(LANE_KEY);
    return raw === "other" ? "other" : "focus";
  } catch {
    return "focus";
  }
}

export function writeStoredInboxFocusLane(lane: InboxFocusLane): void {
  try {
    localStorage.setItem(LANE_KEY, lane);
  } catch {
    /* ignore */
  }
}

export function readStoredInboxQueryFilters(): Set<InboxQueryFilterId> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(
      parsed.filter((id): id is InboxQueryFilterId =>
        [
          "unread",
          "flagged",
          "pinned",
          "categorized",
          "toMe",
          "hasAttachments",
          "mentions",
          "events",
        ].includes(id),
      ),
    );
  } catch {
    return new Set();
  }
}

export function writeStoredInboxQueryFilters(
  filters: ReadonlySet<InboxQueryFilterId>,
): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify([...filters]));
  } catch {
    /* ignore */
  }
}

export function readStoredUserCategoryFilters(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(USER_CATEGORY_FILTERS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter((id) => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

export function writeStoredUserCategoryFilters(
  filters: ReadonlySet<string>,
): void {
  try {
    localStorage.setItem(
      USER_CATEGORY_FILTERS_KEY,
      JSON.stringify([...filters]),
    );
  } catch {
    /* ignore */
  }
}
