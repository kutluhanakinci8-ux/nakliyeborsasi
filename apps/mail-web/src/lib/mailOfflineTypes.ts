import type {
  MailConnectedAccountRow,
  MailInboxListItem,
  MailInboxSummary,
  MailSendReadiness,
  MailSentItem,
} from "./mailApi";

export type InboxSnapshotPayload = {
  summary: MailInboxSummary;
  sendReadiness?: MailSendReadiness;
  messages: MailInboxListItem[];
  sent: MailSentItem[];
  connectedAccounts?: MailConnectedAccountRow[];
  cachedAt: number;
};
