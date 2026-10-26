"use client";

import { useEffect, useState } from "react";
import {
  fetchMailAttachmentPreviewBlob,
  isMailImageAttachmentContentType,
} from "@/lib/mailAttachmentPreview";

type Props = {
  accessToken: string;
  messageId: string;
  index: number;
  contentType: string;
  filename: string;
};

export function MailAttachmentImagePreview({
  accessToken,
  messageId,
  index,
  contentType,
  filename,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isMailImageAttachmentContentType(contentType)) {
      return;
    }
    let objectUrl: string | null = null;
    void fetchMailAttachmentPreviewBlob(accessToken, messageId, index)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, messageId, index, contentType]);

  if (!isMailImageAttachmentContentType(contentType) || failed) {
    return null;
  }

  if (!src) {
    return (
      <span className="mail-attachment-preview-placeholder" aria-hidden>
        …
      </span>
    );
  }

  return (
    <img
      className="mail-attachment-preview-img"
      src={src}
      alt={filename}
      loading="lazy"
    />
  );
}
