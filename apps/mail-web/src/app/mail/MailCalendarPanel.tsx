"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  downloadCalendarIcs,
  fetchCalendarEvents,
  importCalendarIcs,
  patchCalendarOccurrence,
  type MailCalendarEvent,
} from "@/lib/mailApi";
import {
  buildMonthGrid,
  computeWeekMultiDayBars,
  enumerateDayKeysBetween,
  eventOverlapsDayKey,
  splitGridIntoWeeks,
} from "./mailCalendarGrid";
import { MailCalendarFeedsPanel } from "./MailCalendarFeedsPanel";
import { MailCalendarCalDavPanel } from "./MailCalendarCalDavPanel";
import { MailCalendarGraphPanel } from "./MailCalendarGraphPanel";
import { MailCalendarGooglePanel } from "./MailCalendarGooglePanel";
import {
  fetchCalendarCalDavAccounts,
  pushCalendarEventToCalDav,
  pushCalendarOccurrenceToCalDav,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
};

function monthBounds(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function occurrenceAnchor(ev: MailCalendarEvent): string {
  return ev.occurrenceAnchorAt ?? ev.startsAt;
}

export function MailCalendarPanel({ accessToken, onToast }: Props) {
  const { t, localeTag } = useMailLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<MailCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    "" | "daily" | "weekly" | "monthly"
  >("");
  const [recurrenceUntilLocal, setRecurrenceUntilLocal] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [caldavPushAccountId, setCaldavPushAccountId] = useState<string | null>(
    null,
  );
  const [editingOccurrence, setEditingOccurrence] =
    useState<MailCalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editEndLocal, setEditEndLocal] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editNewAnchorLocal, setEditNewAnchorLocal] = useState("");

  const bounds = useMemo(() => monthBounds(year, month), [year, month]);
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const weeks = useMemo(() => splitGridIntoWeeks(grid), [grid]);
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      for (const key of enumerateDayKeysBetween(ev.startsAt, ev.endsAt)) {
        set.add(key);
      }
    }
    return set;
  }, [events]);
  const multiDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      const keys = enumerateDayKeysBetween(ev.startsAt, ev.endsAt);
      if (keys.length > 1) {
        for (const key of keys) {
          set.add(key);
        }
      }
    }
    return set;
  }, [events]);
  const visibleEvents = useMemo(() => {
    if (!selectedDay) {
      return events;
    }
    return events.filter((ev) =>
      eventOverlapsDayKey(ev.startsAt, ev.endsAt, selectedDay),
    );
  }, [events, selectedDay]);
  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleDateString(localeTag, {
        month: "long",
        year: "numeric",
      }),
    [year, month, localeTag],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCalendarEvents(
        accessToken,
        bounds.from,
        bounds.to,
      );
      setEvents(data.events);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("calLoadErr"),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, bounds.from, bounds.to, onToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchCalendarCalDavAccounts(accessToken)
      .then((data) => {
        const writable = data.accounts.find((a) => a.enabled && a.writeEnabled);
        setCaldavPushAccountId(writable?.id ?? null);
      })
      .catch(() => setCaldavPushAccountId(null));
  }, [accessToken]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(null);
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(null);
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MailCalendarEvent[]>();
    for (const ev of events) {
      for (const key of enumerateDayKeysBetween(ev.startsAt, ev.endsAt)) {
        const list = map.get(key) ?? [];
        list.push(ev);
        map.set(key, list);
      }
    }
    return map;
  }, [events]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDay) {
      return null;
    }
    const d = new Date(`${selectedDay}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return selectedDay;
    }
    return d.toLocaleDateString(localeTag, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [selectedDay, localeTag]);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const padDay = (n: number) => String(n).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${padDay(now.getMonth() + 1)}-${padDay(now.getDate())}`;

  function beginEditOccurrence(ev: MailCalendarEvent) {
    setEditingOccurrence(ev);
    setEditTitle(ev.title);
    setEditStartLocal(toDatetimeLocalValue(ev.startsAt));
    setEditEndLocal(toDatetimeLocalValue(ev.endsAt));
    setEditAllDay(ev.allDay);
    setEditNewAnchorLocal("");
  }

  async function onSaveOccurrenceEdit() {
    if (!editingOccurrence) {
      return;
    }
    const startsAt = new Date(editStartLocal);
    const endsAt = new Date(editEndLocal);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      onToast(t("calInvalidDate"));
      return;
    }
    const currentAnchor = occurrenceAnchor(editingOccurrence);
    let newOccurrenceAnchorAt: string | undefined;
    if (editNewAnchorLocal.trim()) {
      const newAnchor = new Date(editNewAnchorLocal);
      if (Number.isNaN(newAnchor.getTime())) {
        onToast(t("calInvalidRecurrenceKey"));
        return;
      }
      if (newAnchor.getTime() !== new Date(currentAnchor).getTime()) {
        newOccurrenceAnchorAt = newAnchor.toISOString();
      }
    }
    try {
      await patchCalendarOccurrence(accessToken, editingOccurrence.id, {
        occurrenceStartsAt: currentAnchor,
        title: editTitle.trim() || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        allDay: editAllDay,
        newOccurrenceAnchorAt,
      });
      setEditingOccurrence(null);
      onToast(t("calOccurrenceUpdated"));
      void load();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("errGenericSave"),
      );
    }
  }

  async function onAddEvent() {
    if (!title.trim() || !startLocal || !endLocal) {
      onToast(t("calTitleDatesRequired"));
      return;
    }
    const startsAt = new Date(startLocal);
    const endsAt = new Date(endLocal);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      onToast(t("calInvalidDate"));
      return;
    }
    try {
      await createCalendarEvent(accessToken, {
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        allDay,
        recurrenceFrequency: recurrenceFrequency || undefined,
        recurrenceUntil: recurrenceUntilLocal
          ? new Date(`${recurrenceUntilLocal}T23:59:59`).toISOString()
          : undefined,
      });
      setTitle("");
      setRecurrenceFrequency("");
      setRecurrenceUntilLocal("");
      onToast(t("calEventAdded"));
      void load();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("calEventAddErr"),
      );
    }
  }

  return (
    <div className="mail-d6-inner mail-cal-premium">
      <header className="mail-cal-premium-header">
        <div className="mail-cal-premium-heading">
          <h1>{t("calPanelTitle")}</h1>
          <p className="mail-cal-premium-kicker">
            {monthLabel}
            {loading ? t("calUpdating") : ""}
          </p>
        </div>
        <div className="mail-cal-premium-toolbar">
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost"
            onClick={goToday}
            disabled={isCurrentMonth && !selectedDay}
          >
            {t("calToday")}
          </button>
          <div className="mail-cal-nav" role="group" aria-label={t("calMonthPickerAria")}>
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--icon"
              onClick={() => shiftMonth(-1)}
              aria-label={t("calPrevMonth")}
            >
              ‹
            </button>
            <span className="mail-cal-month-label">{monthLabel}</span>
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--icon"
              onClick={() => shiftMonth(1)}
              aria-label={t("calNextMonth")}
            >
              ›
            </button>
          </div>
          <div className="mail-cal-toolbar-actions">
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--ghost"
              onClick={() =>
                void downloadCalendarIcs(accessToken, bounds.from, bounds.to)
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "lerta-takvim.ics";
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch((e: unknown) => {
                    onToast(
                      e instanceof Error ? e.message : t("calExportErr"),
                    );
                  })
              }
            >
              {t("calDownloadIcs")}
            </button>
            <label className="mail-cal-btn mail-cal-btn--ghost mail-cal-file-input">
              {t("calUploadIcs")}
              <input
                type="file"
                accept=".ics,text/calendar"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) {
                    return;
                  }
                  void file.text().then((ics) =>
                    importCalendarIcs(accessToken, ics)
                      .then((r) => {
                        onToast(
                          t("calImportResult", {
                            imported: r.imported,
                            skippedSuffix: r.skipped
                              ? t("calImportSkippedSuffix", {
                                  skipped: r.skipped,
                                })
                              : "",
                          }),
                        );
                        void load();
                      })
                      .catch((err: unknown) => {
                        onToast(
                          err instanceof Error
                            ? err.message
                            : t("calImportErr"),
                        );
                      }),
                  );
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="mail-cal-premium-layout">
        <div className="mail-cal-premium-main">
      <div className="mail-cal-month mail-cal-month--card" aria-label={t("calMonthViewAria")}>
        <div className="mail-cal-grid mail-cal-grid-head" role="row">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((label) => (
            <div key={label} className="mail-cal-weekday" role="columnheader">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => {
          const bars = computeWeekMultiDayBars(week, events);
          return (
            <div key={weekIndex} className="mail-cal-week">
              {bars.length > 0 ? (
                <div className="mail-cal-week-bars" aria-hidden="true">
                  {bars.map((bar) => (
                    <div
                      key={bar.eventKey}
                      className="mail-cal-event-bar"
                      style={{
                        gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                      }}
                      title={bar.title}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mail-cal-grid mail-cal-week-days" role="row">
                {week.map((cell) => {
                  const hasEvents = eventDays.has(cell.key);
                  const multiDay = multiDayKeys.has(cell.key);
                  const selected = selectedDay === cell.key;
                  const isToday = cell.key === todayKey;
                  const dayEvents = eventsByDay.get(cell.key) ?? [];
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      className={[
                        "mail-cal-day",
                        cell.inMonth ? "" : "muted",
                        hasEvents ? "has-events" : "",
                        multiDay ? "multi-day-span" : "",
                        selected ? "selected" : "",
                        isToday ? "today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        setSelectedDay((prev) =>
                          prev === cell.key ? null : cell.key,
                        )
                      }
                    >
                      <span className="mail-cal-day-num">{cell.day}</span>
                      {dayEvents.length > 0 ? (
                        <span className="mail-cal-day-dots" aria-hidden="true">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span key={`${ev.id}-${ev.startsAt}`} />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mail-cal-card mail-cal-composer">
        <h2 className="mail-cal-card-title">{t("calNewEvent")}</h2>
        <div className="mail-cal-form-grid">
          <label className="mail-cal-field mail-cal-field--full">
            <span className="mail-cal-field-label">{t("calFieldTitle")}</span>
            <input
              className="mail-cal-input"
              placeholder={t("calEventTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="mail-cal-field">
            <span className="mail-cal-field-label">{t("calFieldStart")}</span>
            <input
              className="mail-cal-input"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </label>
          <label className="mail-cal-field">
            <span className="mail-cal-field-label">{t("calFieldEnd")}</span>
            <input
              className="mail-cal-input"
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
          </label>
          <label className="mail-cal-field mail-cal-field--check">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            <span>{t("calAllDay")}</span>
          </label>
          <label className="mail-cal-field">
            <span className="mail-cal-field-label">{t("calRecurrence")}</span>
            <select
              className="mail-cal-select"
              value={recurrenceFrequency}
              onChange={(e) =>
                setRecurrenceFrequency(
                  e.target.value as "" | "daily" | "weekly" | "monthly",
                )
              }
            >
              <option value="">{t("calRecurrenceNone")}</option>
              <option value="daily">{t("calRecurrenceDaily")}</option>
              <option value="weekly">{t("calRecurrenceWeekly")}</option>
              <option value="monthly">{t("calRecurrenceMonthly")}</option>
            </select>
          </label>
          {recurrenceFrequency ? (
            <label className="mail-cal-field">
              <span className="mail-cal-field-label">{t("calRecurrenceEnd")}</span>
              <input
                className="mail-cal-input"
                type="date"
                value={recurrenceUntilLocal}
                onChange={(e) => setRecurrenceUntilLocal(e.target.value)}
                title={t("calRecurrenceEndTitle")}
              />
            </label>
          ) : null}
          <div className="mail-cal-form-actions">
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--primary"
              onClick={() => void onAddEvent()}
            >
              {t("calAddEvent")}
            </button>
          </div>
        </div>
      </div>

      {editingOccurrence ? (
        <div className="mail-cal-card mail-cal-occ-edit">
          <h3 className="mail-cal-card-title">{t("calEditOccurrence")}</h3>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            aria-label={t("calFieldTitle")}
          />
          <input
            type="datetime-local"
            value={editStartLocal}
            onChange={(e) => setEditStartLocal(e.target.value)}
            aria-label={t("calFieldStart")}
          />
          <input
            type="datetime-local"
            value={editEndLocal}
            onChange={(e) => setEditEndLocal(e.target.value)}
            aria-label={t("calFieldEnd")}
          />
          <label>
            <input
              type="checkbox"
              checked={editAllDay}
              onChange={(e) => setEditAllDay(e.target.checked)}
            />
            {t("calAllDay")}
          </label>
          <p className="mail-d6-meta">
            {t("calCurrentOccurrenceKey")}{" "}
            {new Date(occurrenceAnchor(editingOccurrence)).toLocaleString(
              localeTag,
            )}
          </p>
          <label>
            {t("calNewRecurrenceKeyCaldav")}
            <input
              type="datetime-local"
              value={editNewAnchorLocal}
              onChange={(e) => setEditNewAnchorLocal(e.target.value)}
              aria-label={t("calNewRecurrenceKey")}
            />
          </label>
          <p className="mail-d6-meta">
            {t("calEditOccurrenceMoveIntro")}{" "}
            <code>_occ_</code> {t("calEditOccurrenceHint")}
          </p>
          <div className="mail-cal-form-actions">
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--primary"
              onClick={() => void onSaveOccurrenceEdit()}
            >
              {t("actionSave")}
            </button>
            <button
              type="button"
              className="mail-cal-btn mail-cal-btn--ghost"
              onClick={() => setEditingOccurrence(null)}
            >
              {t("composeCancel")}
            </button>
          </div>
        </div>
      ) : null}
        </div>

        <aside className="mail-cal-premium-aside">
          <div className="mail-cal-card mail-cal-events-panel">
            <div className="mail-cal-events-panel-head">
              <h2 className="mail-cal-card-title">
                {selectedDay ? t("calListSelectedDay") : t("calListThisMonth")}
              </h2>
              {selectedDay ? (
                <button
                  type="button"
                  className="mail-cal-chip"
                  onClick={() => setSelectedDay(null)}
                >
                  {selectedDayLabel} ×
                </button>
              ) : (
                <span className="mail-cal-events-count">
                  {t("calEventsCount", { count: visibleEvents.length })}
                </span>
              )}
            </div>
            {loading ? (
              <p className="mail-cal-loading">{t("readLoading")}</p>
            ) : null}
            <ul className="mail-cal-event-list">
        {visibleEvents.map((ev) => (
          <li key={`${ev.id}-${ev.startsAt}`} className="mail-cal-event-item">
            <div className="mail-cal-event-body">
              <strong className="mail-cal-event-title">
                {ev.title}
                {ev.recurrenceRule ? (
                  <span className="mail-cal-badge" title={t("calRecurringTitle")}>
                    ↻
                  </span>
                ) : null}
                {ev.isOccurrenceOverride ? (
                  <span
                    className="mail-cal-badge"
                    title={t("calCustomEditBadge")}
                  >
                    ✎
                  </span>
                ) : null}
              </strong>
              <div className="mail-d6-meta mail-cal-event-time">
                {ev.allDay
                  ? new Date(ev.startsAt).toLocaleDateString(localeTag, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : `${new Date(ev.startsAt).toLocaleString(localeTag, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} – ${new Date(ev.endsAt).toLocaleTimeString(localeTag, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
              </div>
            </div>
            <span className="mail-cal-event-actions">
              {caldavPushAccountId ? (
                <>
                  {ev.recurrenceRule ? (
                    <button
                      type="button"
                      className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                      onClick={() =>
                        void pushCalendarEventToCalDav(
                          accessToken,
                          caldavPushAccountId,
                          ev.id,
                        )
                          .then(() => onToast(t("calCaldavSeriesWritten")))
                          .catch((err: unknown) => {
                            onToast(
                              err instanceof Error
                                ? err.message
                                : t("calCaldavWriteErr"),
                            );
                          })
                      }
                    >
                      {t("calCaldavPushSeries")}
                    </button>
                  ) : null}
                  {ev.recurrenceRule && ev.occurrenceAnchorAt ? (
                    <button
                      type="button"
                      className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                      onClick={() =>
                        void pushCalendarOccurrenceToCalDav(
                          accessToken,
                          caldavPushAccountId,
                          ev.id,
                          occurrenceAnchor(ev),
                        )
                          .then(() =>
                            onToast(t("calCaldavOccurrenceWritten")),
                          )
                          .catch((err: unknown) => {
                            onToast(
                              err instanceof Error
                                ? err.message
                                : t("calCaldavWriteErr"),
                            );
                          })
                      }
                    >
                      {t("calCaldavPushOccurrence")}
                    </button>
                  ) : !ev.recurrenceRule ? (
                    <button
                      type="button"
                      className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                      onClick={() =>
                        void pushCalendarEventToCalDav(
                          accessToken,
                          caldavPushAccountId,
                          ev.id,
                        )
                          .then(() => onToast(t("calCaldavWritten")))
                          .catch((err: unknown) => {
                            onToast(
                              err instanceof Error
                                ? err.message
                                : t("calCaldavWriteErr"),
                            );
                          })
                      }
                    >
                      {t("calWriteToCaldav")}
                    </button>
                  ) : null}
                </>
              ) : null}
              {ev.recurrenceRule ? (
                <>
                  <button
                    type="button"
                    className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                    onClick={() => beginEditOccurrence(ev)}
                  >
                    {t("draftEdit")}
                  </button>
                  <button
                    type="button"
                    className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                    onClick={() =>
                      void deleteCalendarEvent(
                        accessToken,
                        ev.id,
                        occurrenceAnchor(ev),
                      )
                        .then(() => {
                          onToast(t("calOccurrenceRemoved"));
                          void load();
                        })
                        .catch((err: unknown) => {
                          onToast(
                            err instanceof Error
                              ? err.message
                              : t("calOccurrenceRemoveErr"),
                          );
                        })
                    }
                  >
                    {t("calDeleteOccurrence")}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteCalendarEvent(accessToken, ev.id)
                    .then(() => {
                      onToast(
                        ev.recurrenceRule
                          ? t("calSeriesDeleted")
                          : t("calEventDeleted"),
                      );
                      void load();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error
                          ? err.message
                          : t("errDeleteFailed"),
                      );
                    })
                }
              >
                {ev.recurrenceRule ? t("calDeleteSeries") : t("actionDelete")}
              </button>
            </span>
          </li>
        ))}
        {!loading && visibleEvents.length === 0 ? (
          <li className="mail-cal-event-empty">
            {selectedDay ? t("calNoEventsDay") : t("calNoEventsMonth")}
          </li>
        ) : null}
            </ul>
          </div>
        </aside>
      </div>

      <div className="mail-cal-integrations">
      <MailCalendarFeedsPanel
        accessToken={accessToken}
        onToast={onToast}
        onSynced={() => void load()}
      />
      <MailCalendarCalDavPanel
        accessToken={accessToken}
        onToast={onToast}
        onSynced={() => void load()}
      />
      <MailCalendarGraphPanel
        accessToken={accessToken}
        onToast={onToast}
        onSynced={() => void load()}
      />
      <MailCalendarGooglePanel
        accessToken={accessToken}
        onToast={onToast}
        onSynced={() => void load()}
      />
      </div>
    </div>
  );
}
