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

  const bounds = useMemo(() => monthBounds(year, month), [year, month]);
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

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
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
      });
      setTitle("");
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
        <button type="button" onClick={() => void onAddEvent()}>
          Ekle
        </button>
      </div>

      {loading ? <p>Yükleniyor…</p> : null}
      <ul className="mail-d6-list">
        {events.map((ev) => (
          <li key={ev.id}>
            <div>
              <strong>{ev.title}</strong>
              <div className="mail-d6-meta">
                {ev.allDay
                  ? new Date(ev.startsAt).toLocaleDateString("tr-TR")
                  : `${new Date(ev.startsAt).toLocaleString("tr-TR")} – ${new Date(ev.endsAt).toLocaleString("tr-TR")}`}
              </div>
            </div>
            <button
              type="button"
              className="mail-d6-danger"
              onClick={() =>
                void deleteCalendarEvent(accessToken, ev.id)
                  .then(() => {
                    onToast("Silindi.");
                    void load();
                  })
                  .catch((err: unknown) => {
                    onToast(
                      err instanceof Error ? err.message : "Silinemedi.",
                    );
                  })
              }
            >
              Sil
            </button>
          </li>
        ))}
        {!loading && events.length === 0 ? (
          <li className="mail-d6-empty">Bu ay etkinlik yok.</li>
        ) : null}
      </ul>
      <p className="mail-d6-hint">
        Harici CalDAV sunucusu bağlantısı sonraki fazda; şimdilik org takvimi ve
        iCal içe/dışa aktarma.
      </p>
    </div>
  );
}
