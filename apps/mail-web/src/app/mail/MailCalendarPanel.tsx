"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  downloadCalendarIcs,
  fetchCalendarEvents,
  importCalendarIcs,
  type MailCalendarEvent,
} from "@/lib/mailApi";
import {
  buildMonthGrid,
  dayKeyFromIso,
  enumerateDayKeysBetween,
  eventOverlapsDayKey,
} from "./mailCalendarGrid";
import { MailCalendarFeedsPanel } from "./MailCalendarFeedsPanel";
import { MailCalendarCalDavPanel } from "./MailCalendarCalDavPanel";
import {
  fetchCalendarCalDavAccounts,
  pushCalendarEventToCalDav,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
};

function monthBounds(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function MailCalendarPanel({ accessToken, onToast }: Props) {
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

  const bounds = useMemo(() => monthBounds(year, month), [year, month]);
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
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
      new Date(year, month, 1).toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      }),
    [year, month],
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
        error instanceof Error ? error.message : "Takvim yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, bounds.from, bounds.to, onToast]);

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

  async function onAddEvent() {
    if (!title.trim() || !startLocal || !endLocal) {
      onToast("Başlık ve tarihler gerekli.");
      return;
    }
    const startsAt = new Date(startLocal);
    const endsAt = new Date(endLocal);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      onToast("Geçersiz tarih.");
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
      onToast("Etkinlik eklendi.");
      void load();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Etkinlik eklenemedi.",
      );
    }
  }

  return (
    <div className="mail-d6-inner">
      <header className="mail-d6-header">
        <h1>Takvim</h1>
        <div className="mail-d6-toolbar">
          <button type="button" onClick={() => shiftMonth(-1)}>←</button>
          <span>{monthLabel}</span>
          <button type="button" onClick={() => shiftMonth(1)}>→</button>
          <button
            type="button"
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
                    e instanceof Error ? e.message : "Dışa aktarılamadı.",
                  );
                })
            }
          >
            .ics indir
          </button>
          <label className="mail-d6-file-btn">
            .ics yükle
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
                        `${r.imported} etkinlik içe aktarıldı${r.skipped ? `, ${r.skipped} atlandı` : ""}.`,
                      );
                      void load();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error
                          ? err.message
                          : "İçe aktarma başarısız.",
                      );
                    }),
                );
              }}
            />
          </label>
        </div>
      </header>

      <div className="mail-cal-grid" role="grid" aria-label="Ay görünümü">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((label) => (
          <div key={label} className="mail-cal-weekday" role="columnheader">
            {label}
          </div>
        ))}
        {grid.map((cell) => {
          const hasEvents = eventDays.has(cell.key);
          const multiDay = multiDayKeys.has(cell.key);
          const selected = selectedDay === cell.key;
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
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setSelectedDay((prev) => (prev === cell.key ? null : cell.key))
              }
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      {selectedDay ? (
        <p className="mail-d6-filter-hint">
          Filtre: {selectedDay}{" "}
          <button type="button" onClick={() => setSelectedDay(null)}>
            Tüm ay
          </button>
        </p>
      ) : null}

      <div className="mail-d6-form">
        <input
          placeholder="Etkinlik başlığı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="datetime-local"
          value={startLocal}
          onChange={(e) => setStartLocal(e.target.value)}
          aria-label="Başlangıç"
        />
        <input
          type="datetime-local"
          value={endLocal}
          onChange={(e) => setEndLocal(e.target.value)}
          aria-label="Bitiş"
        />
        <label>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          Tüm gün
        </label>
        <select
          value={recurrenceFrequency}
          onChange={(e) =>
            setRecurrenceFrequency(
              e.target.value as "" | "daily" | "weekly" | "monthly",
            )
          }
          aria-label="Tekrar"
        >
          <option value="">Tekrar yok</option>
          <option value="daily">Her gün</option>
          <option value="weekly">Her hafta</option>
          <option value="monthly">Her ay</option>
        </select>
        {recurrenceFrequency ? (
          <input
            type="date"
            value={recurrenceUntilLocal}
            onChange={(e) => setRecurrenceUntilLocal(e.target.value)}
            aria-label="Tekrar bitiş tarihi"
            title="Tekrar bitiş (isteğe bağlı)"
          />
        ) : null}
        <button type="button" onClick={() => void onAddEvent()}>
          Ekle
        </button>
      </div>

      {loading ? <p>Yükleniyor…</p> : null}
      <ul className="mail-d6-list">
        {visibleEvents.map((ev) => (
          <li key={`${ev.id}-${ev.startsAt}`}>
            <div>
              <strong>
                {ev.title}
                {ev.recurrenceRule ? " ↻" : ""}
              </strong>
              <div className="mail-d6-meta">
                {ev.allDay
                  ? new Date(ev.startsAt).toLocaleDateString("tr-TR")
                  : `${new Date(ev.startsAt).toLocaleString("tr-TR")} – ${new Date(ev.endsAt).toLocaleString("tr-TR")}`}
              </div>
            </div>
            <span className="mail-d6-actions">
              {caldavPushAccountId ? (
                <button
                  type="button"
                  onClick={() =>
                    void pushCalendarEventToCalDav(
                      accessToken,
                      caldavPushAccountId,
                      ev.id,
                    )
                      .then(() => onToast("CalDAV’a yazıldı."))
                      .catch((err: unknown) => {
                        onToast(
                          err instanceof Error
                            ? err.message
                            : "CalDAV yazma başarısız.",
                        );
                      })
                  }
                >
                  CalDAV’a yaz
                </button>
              ) : null}
              {ev.recurrenceRule ? (
                <button
                  type="button"
                  onClick={() =>
                    void deleteCalendarEvent(
                      accessToken,
                      ev.id,
                      ev.startsAt,
                    )
                      .then(() => {
                        onToast("Bu tekrar kaldırıldı.");
                        void load();
                      })
                      .catch((err: unknown) => {
                        onToast(
                          err instanceof Error
                            ? err.message
                            : "Kaldırılamadı.",
                        );
                      })
                  }
                >
                  Bu tekrarı sil
                </button>
              ) : null}
              <button
                type="button"
                className="mail-d6-danger"
                onClick={() =>
                  void deleteCalendarEvent(accessToken, ev.id)
                    .then(() => {
                      onToast(
                        ev.recurrenceRule ? "Tüm seri silindi." : "Silindi.",
                      );
                      void load();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error ? err.message : "Silinemedi.",
                      );
                    })
                }
              >
                {ev.recurrenceRule ? "Tüm seriyi sil" : "Sil"}
              </button>
            </span>
          </li>
        ))}
        {!loading && visibleEvents.length === 0 ? (
          <li className="mail-d6-empty">
            {selectedDay ? "Bu gün etkinlik yok." : "Bu ay etkinlik yok."}
          </li>
        ) : null}
      </ul>
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
    </div>
  );
}
