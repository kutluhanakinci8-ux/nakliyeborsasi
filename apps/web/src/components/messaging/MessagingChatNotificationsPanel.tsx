"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchNotificationPreferenceMatrix,
  updateNotificationPreferences,
  type NotificationPreferenceMatrixEvent,
} from "../../lib/AccountNotificationPreferencesApi";
import { ensureMessagingWebPush } from "../../lib/messagingPush";
import { fetchMessagingPublicStatus } from "../../lib/messagingPublicStatus";

type Props = {
  accessToken: string;
};

function pushStatusLabel(
  state: string,
): string {
  switch (state) {
    case "enabled":
      return "Tarayıcı push kayıtlı";
    case "denied":
      return "Bildirim izni reddedildi";
    case "unsupported":
      return "Tarayıcı push desteklemiyor";
    case "unconfigured":
      return "Sunucuda VAPID yapılandırılmamış";
    default:
      return "Push hazırlanıyor…";
  }
}

export function MessagingChatNotificationsPanel({ accessToken }: Props) {
  const [pushState, setPushState] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [matrixBusy, setMatrixBusy] = useState(false);
  const [matrix, setMatrix] = useState<NotificationPreferenceMatrixEvent[]>(
    [],
  );
  const [translateLabel, setTranslateLabel] = useState("—");
  const [webPushServer, setWebPushServer] = useState(false);
  const [error, setError] = useState("");

  const loadMatrix = useCallback(() => {
    void fetchNotificationPreferenceMatrix(accessToken)
      .then((payload) => {
        setMatrix(
          payload.events.filter((row) => row.category === "messaging"),
        );
      })
      .catch(() => setError("Bildirim matrisi yüklenemedi"));
  }, [accessToken]);

  useEffect(() => {
    loadMatrix();
    void fetchMessagingPublicStatus()
      .then((status) => {
        const parts: string[] = [];
        if (status.translate.deepl) {
          parts.push("DeepL");
        }
        if (status.translate.libretranslate) {
          parts.push("LibreTranslate");
        }
        setTranslateLabel(
          parts.length > 0 ? parts.join(" + ") : "Sunucuda çeviri kapalı",
        );
        setWebPushServer(status.webPush.enabled);
      })
      .catch(() => setTranslateLabel("Durum alınamadı"));
  }, [loadMatrix]);

  async function enablePush(): Promise<void> {
    setPushBusy(true);
    try {
      const result = await ensureMessagingWebPush(accessToken);
      setPushState(result);
    } finally {
      setPushBusy(false);
    }
  }

  async function toggleEmail(
    row: NotificationPreferenceMatrixEvent,
    enabled: boolean,
  ): Promise<void> {
    if (!row.preferenceKey) {
      return;
    }
    setMatrixBusy(true);
    try {
      await updateNotificationPreferences(accessToken, {
        [row.preferenceKey]: enabled,
      });
      loadMatrix();
    } finally {
      setMatrixBusy(false);
    }
  }

  async function togglePush(
    row: NotificationPreferenceMatrixEvent,
    enabled: boolean,
  ): Promise<void> {
    if (!row.pushPreferenceKey) {
      return;
    }
    setMatrixBusy(true);
    try {
      await updateNotificationPreferences(accessToken, {
        [row.pushPreferenceKey]: enabled,
      });
      loadMatrix();
    } finally {
      setMatrixBusy(false);
    }
  }

  return (
    <section
      className="messaging-chat-notifications-panel"
      aria-label="Mesaj bildirimleri ve çeviri"
    >
      <h3 className="messaging-chat-notifications-title">
        Push, çeviri ve bildirim matrisi
      </h3>
      {error ? <p className="error banner error--light">{error}</p> : null}

      <div className="messaging-chat-notifications-block">
        <h4 className="messaging-chat-notifications-sub">Tarayıcı push</h4>
        <p className="module-hint">
          Firma sohbeti için web push
          {webPushServer ? " (sunucu hazır)" : " (sunucu kapalı)"}.
        </p>
        <button
          type="button"
          className="messaging-chat-notifications-push-btn"
          disabled={pushBusy || !webPushServer}
          onClick={() => void enablePush()}
        >
          {pushBusy ? "Kaydediliyor…" : "Push bildirimlerini etkinleştir"}
        </button>
        {pushState ? (
          <p className="module-hint" role="status">{pushStatusLabel(pushState)}</p>
        ) : null}
      </div>

      <div className="messaging-chat-notifications-block">
        <h4 className="messaging-chat-notifications-sub">Mesaj çevirisi</h4>
        <p className="module-hint">
          Konuşmadaki her mesajda <strong>Çevir</strong> menüsü (EN / DE / RU).
          Sunucu: {translateLabel}.
        </p>
      </div>

      <div className="messaging-chat-notifications-block">
        <h4 className="messaging-chat-notifications-sub">Bildirim matrisi</h4>
        <table className="messaging-chat-notifications-matrix">
          <thead>
            <tr>
              <th scope="col">Olay</th>
              <th scope="col">E-posta</th>
              <th scope="col">Push</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.eventCode}>
                <td>{row.labelTr}</td>
                <td>
                  {row.preferenceKey ? (
                    <input
                      type="checkbox"
                      aria-label={`${row.labelTr} e-posta`}
                      checked={row.channels.email}
                      disabled={matrixBusy}
                      onChange={(event) =>
                        void toggleEmail(row, event.target.checked)
                      }
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {row.pushPreferenceKey ? (
                    <input
                      type="checkbox"
                      aria-label={`${row.labelTr} push`}
                      checked={Boolean(row.channels.push)}
                      disabled={matrixBusy}
                      onChange={(event) =>
                        void togglePush(row, event.target.checked)
                      }
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
