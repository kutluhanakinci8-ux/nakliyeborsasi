"use client";

import { renderMessagingMarkdown } from "../../lib/messagingMarkdown";

export function ChatMessageBody({ text }: { text: string }) {
  const html = renderMessagingMarkdown(text);
  return (
    <p
      className="chat-bubble-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
