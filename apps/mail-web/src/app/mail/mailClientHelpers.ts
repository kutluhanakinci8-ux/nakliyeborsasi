"use client";

import type { MailInboxFolder } from "@/lib/mailApi";

export type MailClientView =
  | "inbox"
  | "spam"
  | "sent"
  | "all"
  | "archive"
  | "trash"
  | "starred"
  | "snoozed"
  | "drafts"
  | "calendar"
  | "contacts";

export function inboxFolderForView(view: MailClientView): MailInboxFolder {
  if (view === "spam") {
    return "spam";
  }
  if (view === "all") {
    return "all";
  }
  if (view === "archive") {
    return "archive";
  }
  if (view === "trash") {
    return "trash";
  }
  if (view === "starred") {
    return "starred";
  }
  if (view === "snoozed") {
    return "snoozed";
  }
  return "inbox";
}
