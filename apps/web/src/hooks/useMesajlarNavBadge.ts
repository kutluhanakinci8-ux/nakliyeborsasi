"use client";

import { useEffect, useState } from "react";
import { fetchCompanyMailInbox } from "../lib/CompanyMailInboxApi";
import { MessagingApiClient } from "../lib/MessagingApiClient";

const POLL_MS = 45_000;

/**
 * Toplam okunmamış: firma sohbeti + kurumsal kutu gelen (varsa).
 */
export function useMesajlarNavBadge(
  accessToken: string | null,
  locale: string,
): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setTotal(0);
      return;
    }

    let cancelled = false;

    async function refresh(): Promise<void> {
      const token = accessToken;
      if (!token) {
        return;
      }
      let chatUnread = 0;
      let mailUnread = 0;
      try {
        const threads = await MessagingApiClient.listThreads(token, locale);
        chatUnread = (threads.threads ?? []).reduce(
          (sum, t) => sum + (t.unreadCount ?? 0),
          0,
        );
      } catch {
        /* modül kapalı veya geçici hata */
      }
      try {
        const inbox = await fetchCompanyMailInbox(token, "inbox");
        mailUnread = inbox.summary?.unreadCount ?? 0;
      } catch {
        /* henüz kutu yok */
      }
      if (!cancelled) {
        setTotal(chatUnread + mailUnread);
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken, locale]);

  return total;
}
