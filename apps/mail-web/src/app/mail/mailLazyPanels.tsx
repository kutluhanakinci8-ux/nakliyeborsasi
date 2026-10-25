"use client";

import dynamic from "next/dynamic";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { MailPanelSkeleton } from "./MailPanelSkeleton";

function LazyPanelSkeleton({ labelKey }: { labelKey?: string }) {
  const { t } = useMailLocale();
  return (
    <MailPanelSkeleton label={labelKey ? t(labelKey) : undefined} />
  );
}

export const MailCalendarPanel = dynamic(
  () =>
    import("./MailCalendarPanel").then((m) => ({
      default: m.MailCalendarPanel,
    })),
  {
    loading: () => <LazyPanelSkeleton labelKey="navCalendar" />,
    ssr: false,
  },
);

export const MailContactsPanel = dynamic(
  () =>
    import("./MailContactsPanel").then((m) => ({
      default: m.MailContactsPanel,
    })),
  {
    loading: () => <LazyPanelSkeleton labelKey="navContacts" />,
    ssr: false,
  },
);

export const MailSettingsPanel = dynamic(
  () =>
    import("./MailSettingsPanel").then((m) => ({
      default: m.MailSettingsPanel,
    })),
  {
    loading: () => <LazyPanelSkeleton labelKey="settingsTitle" />,
    ssr: false,
  },
);

export const MailCampaignHistoryPanel = dynamic(
  () =>
    import("./MailCampaignHistoryPanel").then((m) => ({
      default: m.MailCampaignHistoryPanel,
    })),
  {
    loading: () => <MailPanelSkeleton />,
    ssr: false,
  },
);

export const MailCampaignBlockEditor = dynamic(
  () =>
    import("./MailCampaignBlockEditor").then((m) => ({
      default: m.MailCampaignBlockEditor,
    })),
  {
    loading: () => <MailPanelSkeleton />,
    ssr: false,
  },
);

export const ComposeRichEditor = dynamic(
  () =>
    import("./ComposeRichEditor").then((m) => ({
      default: m.ComposeRichEditor,
    })),
  {
    loading: () => <LazyPanelSkeleton labelKey="lazyRichEditor" />,
    ssr: false,
  },
);
