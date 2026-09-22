"use client";

import { useCallback, useRef, useState } from "react";
import { CountryFlag } from "../CountryFlag";
import { formatParticipantType } from "../../lib/PlatformAdminApiClient";
import type { OrgAction } from "./organizationTypes";

const SWIPE_WIDTH = 168;

type CompanyItem = {
  id: string;
  legalName: string;
  countryCode: string;
  participantTypeCode: string | null;
  userCount: number;
  listingCount: number;
};

type OrganizationSwipeListItemProps = {
  item: CompanyItem;
  logoUrl?: string;
  countryCode: string;
  frozen: boolean;
  isSelected: boolean;
  isSwipeOpen: boolean;
  onSelect: () => void;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onAction: (action: OrgAction) => void;
};

function companyLogoInitials(legalName: string): string {
  const words = legalName
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return "NB";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

export function OrganizationSwipeListItem({
  item,
  logoUrl,
  countryCode,
  frozen,
  isSelected,
  isSwipeOpen,
  onSelect,
  onSwipeOpen,
  onSwipeClose,
  onAction,
}: OrganizationSwipeListItemProps) {
  const logo = logoUrl?.trim() ?? "";
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStartX = useRef(0);
  const dragging = useRef(false);

  const offset = isSwipeOpen ? SWIPE_WIDTH : dragOffset;

  const endDrag = useCallback(
    (finalOffset: number) => {
      dragging.current = false;
      if (finalOffset > SWIPE_WIDTH * 0.45) {
        onSwipeOpen();
      } else {
        onSwipeClose();
      }
      setDragOffset(0);
    },
    [onSwipeClose, onSwipeOpen],
  );

  function onPointerDown(clientX: number) {
    pointerStartX.current = clientX;
    dragging.current = true;
  }

  function onPointerMove(clientX: number) {
    if (!dragging.current) {
      return;
    }
    const delta = pointerStartX.current - clientX;
    if (isSwipeOpen) {
      const next = Math.max(0, Math.min(SWIPE_WIDTH, SWIPE_WIDTH + delta));
      setDragOffset(next - SWIPE_WIDTH);
      return;
    }
    if (delta > 0) {
      setDragOffset(Math.min(delta, SWIPE_WIDTH));
    } else {
      setDragOffset(0);
    }
  }

  function onPointerUp() {
    if (!dragging.current) {
      return;
    }
    endDrag(isSwipeOpen ? SWIPE_WIDTH + dragOffset : dragOffset);
  }

  return (
    <div className="admin-org-swipe-wrap">
      <div className="admin-org-swipe-actions" aria-hidden={offset < 8}>
        <button
          type="button"
          className="admin-org-swipe-action admin-org-swipe-action--edit"
          onClick={() => onAction("edit")}
        >
          Düzenle
        </button>
        <button
          type="button"
          className="admin-org-swipe-action admin-org-swipe-action--restrict"
          onClick={() => onAction("restrict")}
        >
          Kısıtla
        </button>
        <button
          type="button"
          className="admin-org-swipe-action admin-org-swipe-action--delete"
          onClick={() => onAction("delete")}
        >
          Sil
        </button>
      </div>
      <div
        className={isSelected ? "admin-org-swipe-front active" : "admin-org-swipe-front"}
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={(event) => onPointerDown(event.touches[0].clientX)}
        onTouchMove={(event) => onPointerMove(event.touches[0].clientX)}
        onTouchEnd={() => onPointerUp()}
        onMouseDown={(event) => onPointerDown(event.clientX)}
        onMouseMove={(event) => {
          if (dragging.current) {
            onPointerMove(event.clientX);
          }
        }}
        onMouseUp={() => onPointerUp()}
        onMouseLeave={() => {
          if (dragging.current) {
            onPointerUp();
          }
        }}
      >
        <button
          type="button"
          className="admin-org-swipe-card-btn"
          onClick={(event) => {
            if (offset > 12) {
              event.preventDefault();
              onSwipeClose();
              return;
            }
            onSelect();
          }}
        >
          <div className="admin-org-swipe-card-row">
            {logo ? (
              <img
                className="admin-org-company-logo"
                src={logo}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="admin-org-company-logo admin-org-company-logo--placeholder"
                aria-hidden
              >
                {companyLogoInitials(item.legalName)}
              </span>
            )}
            <div className="admin-org-swipe-card-body">
              <span className="admin-org-company-top">
                <CountryFlag
                  code={countryCode}
                  size="sm"
                  className="admin-org-company-flag"
                />
                <strong>{item.legalName}</strong>
                {frozen ? (
                  <span className="admin-org-badge admin-org-badge--danger">
                    Donduruldu
                  </span>
                ) : null}
              </span>
              <span className="admin-org-company-meta">
                <span className="admin-org-badge">
                  {formatParticipantType(item.participantTypeCode)}
                </span>
                <span>
                  {item.userCount} kullanıcı · {item.listingCount} ilan
                </span>
              </span>
              <code>{item.id.slice(0, 8)}…</code>
            </div>
          </div>
        </button>
        <span className="admin-org-swipe-hint" aria-hidden>
          ← kaydır
        </span>
      </div>
    </div>
  );
}
