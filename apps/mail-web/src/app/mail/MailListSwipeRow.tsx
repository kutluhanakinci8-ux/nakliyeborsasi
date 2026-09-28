"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

const REVEAL_PX = 152;
const OPEN_THRESHOLD = 56;
const DRAG_START_PX = 10;

type Props = {
  children: ReactNode;
  showArchive?: boolean;
  archiveLabel?: string;
  onArchive: () => void;
  onDelete: () => void;
};

export function MailListSwipeRow({
  children,
  showArchive = true,
  archiveLabel = "Arşivle",
  onArchive,
  onDelete,
}: Props) {
  const [offset, setOffset] = useState(0);
  const dragRef = useRef({
    active: false,
    dragging: false,
    startX: 0,
    startOffset: 0,
    pointerId: -1,
  });

  const clampOffset = useCallback((value: number) => {
    return Math.max(-REVEAL_PX, Math.min(0, value));
  }, []);

  const snapOffset = useCallback((value: number) => {
    if (value < -OPEN_THRESHOLD) {
      return -REVEAL_PX;
    }
    return 0;
  }, []);

  useEffect(() => {
    const onDocPointerUp = () => {
      if (!dragRef.current.active) {
        return;
      }
      dragRef.current.active = false;
      dragRef.current.dragging = false;
      setOffset((current) => snapOffset(current));
    };
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("pointercancel", onDocPointerUp);
    return () => {
      document.removeEventListener("pointerup", onDocPointerUp);
      document.removeEventListener("pointercancel", onDocPointerUp);
    };
  }, [snapOffset]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
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
      startOffset: offset,
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
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    setOffset(clampOffset(dragRef.current.startOffset + delta));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const wasDrag = dragRef.current.dragging;
    dragRef.current.active = false;
    dragRef.current.dragging = false;
    if (
      wasDrag &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setOffset((current) => snapOffset(current));
    }
  }

  function close() {
    setOffset(0);
  }

  return (
    <div
      className="mail-swipe-row"
      onClick={(e) => {
        if (offset < -8) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="mail-swipe-actions" aria-hidden={offset === 0}>
        {showArchive ? (
          <button
            type="button"
            className="mail-swipe-action mail-swipe-action--archive"
            onClick={() => {
              close();
              onArchive();
            }}
          >
            {archiveLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="mail-swipe-action mail-swipe-action--delete"
          onClick={() => {
            close();
            onDelete();
          }}
        >
          Sil
        </button>
      </div>
      <div
        className="mail-swipe-content"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
