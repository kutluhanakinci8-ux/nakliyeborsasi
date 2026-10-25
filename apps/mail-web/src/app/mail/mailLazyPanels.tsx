"use client";

import dynamic from "next/dynamic";
import { MailPanelSkeleton } from "./MailPanelSkeleton";

export const MailCalendarPanel = dynamic(
  () =>
    import("./MailCalendarPanel").then((m) => ({
      default: m.MailCalendarPanel,
    })),
  {
    loading: () => <MailPanelSkeleton label="Takvim" />,
    ssr: false,
  },
);

export const MailContactsPanel = dynamic(
  () =>
    import("./MailContactsPanel").then((m) => ({
      default: m.MailContactsPanel,
    })),
  {
    loading: () => <MailPanelSkeleton label="Kişiler" />,
    ssr: false,
  },
);

export const MailSettingsPanel = dynamic(
  () =>
    import("./MailSettingsPanel").then((m) => ({
      default: m.MailSettingsPanel,
    })),
  {
    loading: () => <MailPanelSkeleton label="Ayarlar" />,
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
    loading: () => <MailPanelSkeleton label="Yazı editörü" />,
    ssr: false,
  },
);
