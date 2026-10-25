"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { MailSwipePrimaryAction } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

const REVEAL_PX = 152;
const OPEN_THRESHOLD = 48;
const DRAG_START_PX = 8;
const FULL_COMMIT_PX = Math.round(REVEAL_PX * 0.9);

type Props = {
  children: ReactNode;
  rowKey: string;
  activeSwipeKey: string | null;
  onActiveSwipeKeyChange: (key: string | null) => void;
  primaryAction: MailSwipePrimaryAction;
  showArchive?: boolean;
  archiveLabel?: string;
  readLabel?: string;
  onArchive: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
};

export function MailListSwipeRow({
  children,
  rowKey,
  activeSwipeKey,
  onActiveSwipeKeyChange,
  primaryAction,
  showArchive = true,
  archiveLabel,
  readLabel,
  onArchive,
  onDelete,
  onToggleRead,
}: Props) {
  const { t } = useMailLocale();
  const resolvedArchiveLabel = archiveLabel ?? t("swipeArchive");
  const resolvedReadLabel = readLabel ?? t("swipeRead");
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef(0);
  const blockClickUntilRef = useRef(0);
  const dragRef = useRef({
    active: false,
    dragging: false,
    startX: 0,
    startOffset: 0,
    pointerId: -1,
  });

  const primaryHandler = useMemo(() => {
    if (primaryAction === "delete") {
      return onDelete;
    }
    if (primaryAction === "read") {
      return onToggleRead;
    }
    return onArchive;
  }, [primaryAction, onArchive, onDelete, onToggleRead]);

  const actions = useMemo(() => {
    const archiveBtn = showArchive
      ? {
          key: "archive",
          label: resolvedArchiveLabel,
          className: "mail-swipe-action mail-swipe-action--archive",
          onClick: onArchive,
        }
      : null;
    const deleteBtn = {
      key: "delete",
      label: t("swipeDeleteLabel"),
      className: "mail-swipe-action mail-swipe-action--delete",
      onClick: onDelete,
    };
    const readBtn = {
      key: "read",
      label: resolvedReadLabel,
      className: "mail-swipe-action mail-swipe-action--read",
      onClick: onToggleRead,
    };

    if (primaryAction === "delete") {
      return [deleteBtn, archiveBtn].filter(Boolean) as NonNullable<
        typeof archiveBtn
      >[];
    }
    if (primaryAction === "read") {
      return [readBtn, archiveBtn ?? deleteBtn].filter(Boolean) as NonNullable<
        typeof archiveBtn
      >[];
    }
    return [archiveBtn, deleteBtn].filter(Boolean) as NonNullable<
      typeof archiveBtn
    >[];
  }, [
    primaryAction,
    showArchive,
    resolvedArchiveLabel,
    resolvedReadLabel,
    t,
    onArchive,
    onDelete,
    onToggleRead,
  ]);

  const setOffsetSynced = useCallback((value: number) => {
    const clamped = Math.max(-REVEAL_PX, Math.min(0, value));
    offsetRef.current = clamped;
    setOffset(clamped);
  }, []);

  const snapOffset = useCallback((value: number) => {
    if (value < -OPEN_THRESHOLD) {
      return -REVEAL_PX;
    }
    return 0;
  }, []);

  const runPrimaryCommit = useCallback(() => {
    blockClickUntilRef.current = Date.now() + 500;
    setOffsetSynced(0);
    onActiveSwipeKeyChange(null);
    primaryHandler();
  }, [onActiveSwipeKeyChange, primaryHandler, setOffsetSynced]);

  const finishDrag = useCallback(
    (snap: boolean) => {
      dragRef.current.active = false;
      dragRef.current.dragging = false;
      setIsDragging(false);
      if (!snap) {
        return;
      }
      const current = offsetRef.current;
      if (current <= -FULL_COMMIT_PX) {
        runPrimaryCommit();
        return;
      }
      const next = snapOffset(current);
      setOffsetSynced(next);
      if (next < 0) {
        blockClickUntilRef.current = Date.now() + 400;
        onActiveSwipeKeyChange(rowKey);
      } else {
        onActiveSwipeKeyChange(null);
      }
    },
    [
      onActiveSwipeKeyChange,
      rowKey,
      runPrimaryCommit,
      setOffsetSynced,
      snapOffset,
    ],
  );

  useEffect(() => {
    if (activeSwipeKey !== rowKey && offsetRef.current !== 0) {
      setOffsetSynced(0);
    }
  }, [activeSwipeKey, rowKey, setOffsetSynced]);

  useEffect(() => {
    const onDocPointerUp = (event: PointerEvent) => {
      if (!dragRef.current.active) {
        return;
      }
      if (dragRef.current.pointerId === event.pointerId) {
        finishDrag(true);
      }
    };
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("pointercancel", onDocPointerUp);
    return () => {
      document.removeEventListener("pointerup", onDocPointerUp);
      document.removeEventListener("pointercancel", onDocPointerUp);
    };
  }, [finishDrag]);

  function shouldBlockClick() {
    return Date.now() < blockClickUntilRef.current;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || shouldBlockClick()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (
      target.closest("button, input, a, textarea, select, [data-no-swipe]")
    ) {
      return;
    }
    dragRef.current = {
      active: true,
      dragging: false,
      startX: event.clientX,
      startOffset: offsetRef.current,
      pointerId: event.pointerId,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const delta = event.clientX - dragRef.current.startX;
    if (!dragRef.current.dragging) {
      if (Math.abs(delta) < DRAG_START_PX) {
        return;
      }
      dragRef.current.dragging = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    setOffsetSynced(dragRef.current.startOffset + delta);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const wasDrag = dragRef.current.dragging;
    if (
      wasDrag &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.preventDefault();
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(wasDrag);
  }

  function close() {
    setOffsetSynced(0);
    if (activeSwipeKey === rowKey) {
      onActiveSwipeKeyChange(null);
    }
  }

  const actionsOpen = offset < -8;

  return (
    <div
      className={
        actionsOpen ? "mail-swipe-row mail-swipe-row--open" : "mail-swipe-row"
      }
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".mail-swipe-action")) {
          return;
        }
        if (shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (actionsOpen) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="mail-swipe-actions" aria-hidden={!actionsOpen}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={action.className}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              close();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        className={
          isDragging
            ? "mail-swipe-content is-dragging"
            : "mail-swipe-content"
        }
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (shouldBlockClick()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
