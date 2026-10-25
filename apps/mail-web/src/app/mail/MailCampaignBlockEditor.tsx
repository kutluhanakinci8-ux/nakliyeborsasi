"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useMemo, useState } from "react";

type Block =
  | { id: string; type: "hero"; title: string; subtitle: string }
  | { id: string; type: "text"; body: string }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "image"; src: string; alt: string };

function newId(): string {
  return `b-${Math.random().toString(36).slice(2, 9)}`;
}

function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "hero") {
      parts.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="font-family:system-ui,sans-serif;padding:24px;background:#f1f5f9;border-radius:12px"><h1 style="margin:0 0 8px;font-size:22px">${escapeHtml(block.title)}</h1><p style="margin:0;color:#475569">${escapeHtml(block.subtitle)}</p></td></tr></table>`,
      );
    } else if (block.type === "text") {
      parts.push(
        `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0f172a">${escapeHtml(block.body).replace(/\n/g, "<br/>")}</p>`,
      );
    } else if (block.type === "button") {
      parts.push(
        `<p style="margin:20px 0"><a href="${escapeAttr(block.href)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600">${escapeHtml(block.label)}</a></p>`,
      );
    } else if (block.type === "image") {
      parts.push(
        `<p style="margin:16px 0"><img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}" style="max-width:100%;height:auto;border-radius:8px" /></p>`,
      );
    }
  }
  return parts.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

type Props = {
  html: string;
  onHtmlChange: (html: string) => void;
  label?: string;
};

function initialBlocks(t: (key: string) => string): Block[] {
  return [
    {
      id: newId(),
      type: "hero",
      title: t("campaignBlockHeroTitle"),
      subtitle: t("campaignBlockHeroSubtitle"),
    },
    { id: newId(), type: "text", body: t("campaignBlockTextDefault") },
    {
      id: newId(),
      type: "button",
      label: t("campaignBlockBtnDefault"),
      href: "https://lerta.com.tr",
    },
  ];
}

export function MailCampaignBlockEditor({ html, onHtmlChange, label }: Props) {
  const { t } = useMailLocale();
  const [blocks, setBlocks] = useState<Block[]>(() => initialBlocks(t));

  const previewHtml = useMemo(() => blocksToHtml(blocks), [blocks]);

  const applyToCompose = useCallback(() => {
    onHtmlChange(previewHtml);
  }, [onHtmlChange, previewHtml]);

  const moveBlock = (index: number, delta: number) => {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) {
      return;
    }
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setBlocks(next);
  };

  return (
    <div className="mail-campaign-block-editor">
      <div className="mail-campaign-block-editor-head">
        <span className="compose-field-label">{label ?? t("campaignBlockDefaultLabel")}</span>
        <button type="button" className="compose-chip-btn" onClick={applyToCompose}>
          {t("campaignBlockApply")}
        </button>
      </div>
      <ul className="mail-campaign-block-list">
        {blocks.map((block, index) => (
          <li key={block.id} className="mail-campaign-block-item">
            <div className="mail-campaign-block-toolbar">
              <span className="mail-campaign-block-type">{block.type}</span>
              <button type="button" className="compose-chip-btn" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button type="button" className="compose-chip-btn" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>
                ↓
              </button>
              <button
                type="button"
                className="compose-chip-btn"
                onClick={() => setBlocks(blocks.filter((b) => b.id !== block.id))}
              >
                {t("actionDelete")}
              </button>
            </div>
            {block.type === "hero" ? (
              <>
                <input
                  className="compose-input"
                  value={block.title}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "hero" }).title = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder={t("campaignBlockTitlePh")}
                />
                <input
                  className="compose-input"
                  value={block.subtitle}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "hero" }).subtitle = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder={t("campaignBlockSubtitlePh")}
                />
              </>
            ) : null}
            {block.type === "text" ? (
              <textarea
                className="compose-textarea"
                rows={3}
                value={block.body}
                onChange={(e) => {
                  const next = [...blocks];
                  (next[index] as Block & { type: "text" }).body = e.target.value;
                  setBlocks(next);
                }}
              />
            ) : null}
            {block.type === "button" ? (
              <>
                <input
                  className="compose-input"
                  value={block.label}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "button" }).label = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder={t("campaignBlockBtnTextPh")}
                />
                <input
                  className="compose-input"
                  value={block.href}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "button" }).href = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder="https://"
                />
              </>
            ) : null}
            {block.type === "image" ? (
              <>
                <input
                  className="compose-input"
                  value={block.src}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "image" }).src = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder={t("campaignBlockImageUrlPh")}
                />
                <input
                  className="compose-input"
                  value={block.alt}
                  onChange={(e) => {
                    const next = [...blocks];
                    (next[index] as Block & { type: "image" }).alt = e.target.value;
                    setBlocks(next);
                  }}
                  placeholder={t("campaignBlockAltPh")}
                />
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mail-campaign-block-add">
        <button
          type="button"
          className="compose-chip-btn"
          onClick={() => setBlocks([...blocks, { id: newId(), type: "text", body: "" }])}
        >
          {t("campaignBlockAddText")}
        </button>
        <button
          type="button"
          className="compose-chip-btn"
          onClick={() =>
            setBlocks([
              ...blocks,
              { id: newId(), type: "button", label: t("campaignBlockBtnExplore"), href: "https://" },
            ])
          }
        >
          {t("campaignBlockAddButton")}
        </button>
      </div>
      {html.trim() ? (
        <p className="compose-attach-hint">{t("campaignBlockHtmlLen", { count: html.length })}</p>
      ) : null}
      <div
        className="mail-campaign-block-preview"
        aria-label={t("campaignBlockPreviewAria")}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
}
