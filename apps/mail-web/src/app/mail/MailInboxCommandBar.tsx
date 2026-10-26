"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { InboxFocusLane } from "@/lib/mailInboxFocus";
import {
  INBOX_QUERY_FILTER_IDS,
  type InboxQueryFilterId,
} from "@/lib/mailInboxListFilters";
import type { MailConnectedInboxSource } from "@/lib/mailApi";
import { connectedTabLabel } from "@/lib/mailInboxSourceUi";
import {
  UserCategoryTagIcon,
  userCategoryColors,
  type MailUserInboxCategory,
} from "@/lib/mailUserInboxCategoryUi";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

type Props = {
  t: Translate;
  title: string;
  meta: string;
  inboxFocusLane: InboxFocusLane;
  onFocusLaneChange: (lane: InboxFocusLane) => void;
  activeFilters: ReadonlySet<InboxQueryFilterId>;
  onToggleFilter: (id: InboxQueryFilterId) => void;
  onClearFilters: () => void;
  userCategories: readonly MailUserInboxCategory[];
  activeUserCategoryIds: ReadonlySet<string>;
  onToggleUserCategory: (id: string) => void;
  onClearUserCategoryFilters: () => void;
  showConnectedInboxTabs: boolean;
  inboxConnectedSource: MailConnectedInboxSource;
  onConnectedSourceChange: (source: MailConnectedInboxSource) => void;
  showFocusTabs: boolean;
};

function filterLabelKey(id: InboxQueryFilterId): string {
  const map: Record<InboxQueryFilterId, string> = {
    unread: "inboxFilterUnread",
    flagged: "inboxFilterFlagged",
    pinned: "inboxFilterPinned",
    categorized: "inboxFilterCategorized",
    toMe: "inboxFilterToMe",
    hasAttachments: "inboxFilterAttachments",
    mentions: "inboxFilterMentions",
    events: "inboxFilterEvents",
  };
  return map[id];
}

const MENU_MIN_WIDTH = 248;
const MENU_ESTIMATE_HEIGHT = 360;

export function MailInboxCommandBar({
  t,
  title,
  meta,
  inboxFocusLane,
  onFocusLaneChange,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  userCategories,
  activeUserCategoryIds,
  onToggleUserCategory,
  onClearUserCategoryFilters,
  showConnectedInboxTabs,
  inboxConnectedSource,
  onConnectedSourceChange,
  showFocusTabs,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const menuHeight =
      menuRef.current?.offsetHeight || MENU_ESTIMATE_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUpward =
      spaceBelow < Math.min(menuHeight, MENU_ESTIMATE_HEIGHT) &&
      rect.top > spaceBelow;
    const top = openUpward
      ? Math.max(8, rect.top - menuHeight - 8)
      : rect.bottom + 8;
    const left = Math.min(
      Math.max(8, rect.right - MENU_MIN_WIDTH),
      window.innerWidth - MENU_MIN_WIDTH - 8,
    );
    setMenuPosition({ top, left, minWidth: MENU_MIN_WIDTH });
  }, []);

  useLayoutEffect(() => {
    if (!filterOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    const frame = requestAnimationFrame(() => updateMenuPosition());
    return () => cancelAnimationFrame(frame);
  }, [filterOpen, updateMenuPosition]);

  const keepFocusOnTrigger = useCallback(() => {
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const onFilterMenuPointerDown = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
    },
    [],
  );

  const onToggleFilterItem = useCallback(
    (id: InboxQueryFilterId) => {
      onToggleFilter(id);
      requestAnimationFrame(() => keepFocusOnTrigger());
    },
    [onToggleFilter, keepFocusOnTrigger],
  );

  useEffect(() => {
    if (!filterOpen) {
      return;
    }
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [filterOpen, updateMenuPosition]);

  useEffect(() => {
    if (!filterOpen) {
      return;
    }
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setFilterOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const filterCount = activeFilters.size + activeUserCategoryIds.size;

  const filterMenu =
    filterOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="mail-inbox-filter-menu mail-inbox-filter-menu--portal"
            role="menu"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              zIndex: 600,
            }}
          >
            {INBOX_QUERY_FILTER_IDS.map((id) => {
              const on = activeFilters.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={on}
                  tabIndex={-1}
                  className={`mail-inbox-filter-menu__item${on ? " is-on" : ""}`}
                  onMouseDown={onFilterMenuPointerDown}
                  onClick={() => onToggleFilterItem(id)}
                >
                  <span
                    className="mail-inbox-filter-menu__check"
                    aria-hidden="true"
                  >
                    {on ? "✓" : ""}
                  </span>
                  {t(filterLabelKey(id))}
                </button>
              );
            })}
            {userCategories.length > 0 ? (
              <div
                className="mail-inbox-filter-menu__section"
                role="group"
                aria-label={t("inboxFilterUserCategoriesAria")}
              >
                <p className="mail-inbox-filter-menu__section-title">
                  {t("inboxFilterUserCategoriesTitle")}
                </p>
                {userCategories.map((cat) => {
                  const on = activeUserCategoryIds.has(cat.id);
                  const colors = userCategoryColors(cat.colorKey);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      tabIndex={-1}
                      className={`mail-inbox-filter-menu__item mail-inbox-filter-menu__item--category${on ? " is-on" : ""}`}
                      onMouseDown={onFilterMenuPointerDown}
                      onClick={() => onToggleUserCategory(cat.id)}
                    >
                      <span
                        className="mail-inbox-filter-menu__category-icon"
                        style={{ background: colors.bg, color: colors.fg }}
                      >
                        <UserCategoryTagIcon
                          iconKey={cat.iconKey}
                          colorKey={cat.colorKey}
                          size={14}
                        />
                      </span>
                      <span className="mail-inbox-filter-menu__check" aria-hidden="true">
                        {on ? "✓" : ""}
                      </span>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {filterCount > 0 ? (
              <button
                type="button"
                className="mail-inbox-filter-menu__clear"
                tabIndex={-1}
                onMouseDown={onFilterMenuPointerDown}
                onClick={() => {
                  onClearFilters();
                  onClearUserCategoryFilters();
                  setFilterOpen(false);
                  requestAnimationFrame(() => keepFocusOnTrigger());
                }}
              >
                {t("inboxFilterClear")}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <header className="mail-inbox-command-bar">
      <div className="mail-inbox-command-bar__top">
        <div>
          <h2 className="mail-inbox-command-bar__title">{title}</h2>
          <p className="mail-inbox-command-bar__meta">{meta}</p>
        </div>
      </div>

      {showConnectedInboxTabs ? (
        <div
          className="mail-inbox-connected-tabs mail-inbox-connected-tabs--bar"
          role="tablist"
          aria-label={t("capFilterAria")}
        >
          {(["all", "lerta", "microsoft_graph", "gmail_api"] as const).map(
            (source) => (
              <button
                key={source}
                type="button"
                role="tab"
                aria-selected={inboxConnectedSource === source}
                className={
                  inboxConnectedSource === source
                    ? "mail-inbox-connected-chip is-active"
                    : "mail-inbox-connected-chip"
                }
                onClick={() => onConnectedSourceChange(source)}
              >
                {connectedTabLabel(source, t)}
              </button>
            ),
          )}
        </div>
      ) : null}

      <div className="mail-inbox-command-bar__row">
        {showFocusTabs ? (
          <div
            className="mail-inbox-focus-tabs mail-inbox-focus-tabs--outlook"
            role="tablist"
            aria-label={t("focusedInboxAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={inboxFocusLane === "focus"}
              className={
                inboxFocusLane === "focus"
                  ? "mail-inbox-focus-tab mail-inbox-focus-tab--outlook is-active"
                  : "mail-inbox-focus-tab mail-inbox-focus-tab--outlook"
              }
              onClick={() => onFocusLaneChange("focus")}
            >
              {t("inboxTabFocused")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inboxFocusLane === "other"}
              className={
                inboxFocusLane === "other"
                  ? "mail-inbox-focus-tab mail-inbox-focus-tab--outlook is-active"
                  : "mail-inbox-focus-tab mail-inbox-focus-tab--outlook"
              }
              onClick={() => onFocusLaneChange("other")}
            >
              {t("inboxTabOther")}
            </button>
          </div>
        ) : (
          <span className="mail-inbox-command-bar__spacer" />
        )}

        <div className="mail-inbox-filter-wrap">
          <button
            ref={triggerRef}
            type="button"
            className={`mail-inbox-filter-trigger${filterCount > 0 ? " is-active" : ""}`}
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            onClick={() => setFilterOpen((o) => !o)}
          >
            <span className="mail-inbox-filter-trigger__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>{t("inboxFilterLabel")}</span>
            {filterCount > 0 ? (
              <span className="mail-inbox-filter-badge">{filterCount}</span>
            ) : null}
          </button>
        </div>
      </div>
      {filterMenu}
    </header>
  );
}
