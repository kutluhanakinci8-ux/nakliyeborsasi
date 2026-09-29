"use client";

import { renderMessagingMarkdown } from "../../lib/messagingMarkdown";

export function ChatMessageBody({
  text,
  mentionNameByUserId,
}: {
  text: string;
  mentionNameByUserId?: Record<string, string>;
}) {
  const html = renderMessagingMarkdown(text, mentionNameByUserId);
  return (
    <p
      className="chat-bubble-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
