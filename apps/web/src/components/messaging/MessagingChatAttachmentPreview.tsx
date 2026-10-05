"use client";

import { useEffect, useState } from "react";
import { MessagingApiClient } from "../../lib/MessagingApiClient";

type Props = {
  accessToken: string;
  locale: string;
  threadId: string;
  messageId: string;
  attachmentIndex: number;
  contentType: string;
  filename: string;
  sizeBytes: number;
  onError: (message: string) => void;
};

export function MessagingChatAttachmentPreview({
  accessToken,
  locale,
  threadId,
  messageId,
  attachmentIndex,
  contentType,
  filename,
  sizeBytes,
  onError,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage =
    contentType.toLowerCase().startsWith("image/") ||
    filename.toLowerCase().endsWith(".webp");

  useEffect(() => {
    if (!isImage) {
      return;
    }
    let objectUrl: string | null = null;
    void MessagingApiClient.downloadAttachment(
      accessToken,
      locale,
      threadId,
      messageId,
      attachmentIndex,
    )
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : "Önizleme yüklenemedi");
      });
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    accessToken,
    locale,
    threadId,
    messageId,
    attachmentIndex,
    isImage,
    onError,
  ]);

  if (isImage && previewUrl) {
    return (
      <figure className="chat-attachment-preview">
        <img src={previewUrl} alt={filename} loading="lazy" />
        <figcaption>{filename}</figcaption>
      </figure>
    );
  }

  return (
    <button
      type="button"
      className="chat-attachment-link"
      onClick={async () => {
        try {
          const blob = await MessagingApiClient.downloadAttachment(
            accessToken,
            locale,
            threadId,
            messageId,
            attachmentIndex,
          );
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          onError(error instanceof Error ? error.message : "Ek indirilemedi");
        }
      }}
    >
      📎 {filename} ({Math.round(sizeBytes / 1024)} KB)
    </button>
  );
}
