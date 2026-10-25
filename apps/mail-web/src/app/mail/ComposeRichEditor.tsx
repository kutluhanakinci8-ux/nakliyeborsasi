"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  COMPOSE_HTML_BLOCK_CATALOG,
  composeCtaButtonBlock,
  composeDividerBlock,
  composeCalloutBlock,
  composeFeatureRowBlock,
  composeHeroBlock,
  composeImageBlock,
  composeLegalFooterBlock,
  composeLogoHeaderBlock,
  composeQuoteBlock,
  composeTwoColumnBlock,
  type ComposeHtmlBlockId,
} from "@/lib/mailComposeHtmlBlocks";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  plainText: string;
  onPlainTextChange: (text: string) => void;
  onHtmlChange: (html: string) => void;
  onInlineImage?: (file: File) => Promise<string | null>;
  brandAccentColor?: string | null;
  brandLogoUrl?: string | null;
  brandTitle?: string | null;
  brandLegalFooter?: string | null;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function insertHtmlAtSelection(html: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="compose-rich-tool"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <span className="compose-rich-toolbar__sep" aria-hidden="true" />;
}

const icon = {
  bold: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5h5.5a3.5 3.5 0 0 1 0 7H8V5zm0 7h6a3.5 3.5 0 0 1 0 7H8v-7z" />
    </svg>
  ),
  italic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 5h9v2h-3.2l-3.6 10H16v2H7v-2h3.2l3.6-10H10V5z" />
    </svg>
  ),
  underline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 5v6a6 6 0 0 0 12 0V5M4 19h16" />
    </svg>
  ),
  strike: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12h16M7 5c2.5-2 8.5-2 11 0M7 19c2.5 2 8.5 2 11 0" />
    </svg>
  ),
  listBullet: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 6h14v2H7V6zm0 5h14v2H7v-2zm0 5h14v2H7v-2zM3 6h2v2H3V6zm0 5h2v2H3v-2zm0 5h2v2H3v-2z" />
    </svg>
  ),
  listOrdered: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h1v4H2V6H1V5h2zm0 7h2v1H3v-1zm0 5h2v1H3v-1zM7 6h14v2H7V6zm0 5h14v2H7v-2zm0 5h14v2H7v-2z" />
    </svg>
  ),
  clear: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10 14a4 4 0 0 1 0-5.7l1.3-1.3a4 4 0 0 1 5.7 5.7l-1 1M14 10a4 4 0 0 1 0 5.7l-1.3 1.3a4 4 0 0 1-5.7-5.7l1-1" />
    </svg>
  ),
  divider: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12h16" />
    </svg>
  ),
  button: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="8" width="16" height="8" rx="4" />
      <path d="M9 12h6" />
    </svg>
  ),
  callout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  hero: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="6" rx="2" />
      <path d="M6 14h12M6 17h8" />
    </svg>
  ),
  columns: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="7" height="14" rx="1" />
      <rect x="13" y="5" width="7" height="14" rx="1" />
    </svg>
  ),
  image: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M21 16l-5-5-4 4-2-2-5 5" />
    </svg>
  ),
  imageInline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <rect x="4" y="14" width="16" height="7" rx="2" />
    </svg>
  ),
  table: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <path d="M4 11h16M12 5v14M8 11v8M16 11v8" />
    </svg>
  ),
  video: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="7" width="14" height="10" rx="2" />
      <path d="M17 10l4-2v8l-4-2" />
    </svg>
  ),
};

export function ComposeRichEditor({
  enabled,
  onEnabledChange,
  plainText,
  onPlainTextChange,
  onHtmlChange,
  onInlineImage,
  brandAccentColor,
  brandLogoUrl,
  brandTitle,
  brandLegalFooter,
}: Props) {
  const { t } = useMailLocale();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !editorRef.current) {
      return;
    }
    if (!editorRef.current.innerText.trim() && plainText) {
      editorRef.current.innerText = plainText;
    }
  }, [enabled, plainText]);

  function syncFromEditor() {
    const el = editorRef.current;
    if (!el) {
      return;
    }
    onPlainTextChange(el.innerText);
    onHtmlChange(el.innerHTML);
  }

  function insertLink() {
    const url = window.prompt(t("richPromptLinkUrl"));
    if (url?.trim()) {
      exec("createLink", url.trim());
      syncFromEditor();
    }
  }

  function insertDivider() {
    insertHtmlAtSelection(composeDividerBlock());
    syncFromEditor();
  }

  function insertCtaButton() {
    const label = window.prompt(
      t("richPromptButtonLabel"),
      t("richPromptButtonDefault"),
    );
    if (!label?.trim()) {
      return;
    }
    const href = window.prompt(t("richPromptButtonHref"), "https://");
    if (!href?.trim()) {
      return;
    }
    insertHtmlAtSelection(
      composeCtaButtonBlock(label.trim(), href.trim(), brandAccentColor),
    );
    syncFromEditor();
  }

  function insertCallout(variant: "info" | "success" | "warning" = "info") {
    const text = window.prompt(
      t("richPromptCallout"),
      t("richPromptCalloutDefault"),
    );
    if (!text?.trim()) {
      return;
    }
    insertHtmlAtSelection(composeCalloutBlock(text.trim(), variant));
    syncFromEditor();
  }

  function insertHero() {
    const title = window.prompt(
      t("richPromptHeroTitle"),
      t("richPromptHeroDefault"),
    );
    if (!title?.trim()) {
      return;
    }
    const subtitle = window.prompt(t("richPromptHeroSubtitle"), "") ?? "";
    insertHtmlAtSelection(
      composeHeroBlock(title.trim(), subtitle.trim(), brandAccentColor),
    );
    syncFromEditor();
  }

  function insertBlockById(blockId: ComposeHtmlBlockId) {
    switch (blockId) {
      case "divider":
        insertHtmlAtSelection(composeDividerBlock());
        break;
      case "cta":
        insertCtaButton();
        return;
      case "hero":
        insertHero();
        return;
      case "columns":
        insertHtmlAtSelection(composeTwoColumnBlock());
        break;
      case "callout":
        insertCallout("info");
        return;
      case "callout-success":
        insertCallout("success");
        return;
      case "callout-warning":
        insertCallout("warning");
        return;
      case "quote": {
        const quote = window.prompt(t("richPromptQuote"), "");
        if (!quote?.trim()) {
          return;
        }
        const author = window.prompt(t("richPromptQuoteSource"), "") ?? "";
        insertHtmlAtSelection(composeQuoteBlock(quote.trim(), author.trim()));
        break;
      }
      case "feature": {
        const title = window.prompt(t("richPromptFeatureTitle"), t("richPromptFeatureDefault"));
        if (!title?.trim()) {
          return;
        }
        const body = window.prompt(t("richPromptFeatureBody"), "") ?? "";
        insertHtmlAtSelection(composeFeatureRowBlock(title.trim(), body.trim()));
        break;
      }
      case "logo-header": {
        const logo = brandLogoUrl?.trim() || window.prompt(t("richPromptLogoUrl"), "");
        if (!logo?.trim()) {
          return;
        }
        const title =
          brandTitle?.trim() ||
          window.prompt(t("richPromptBrandTitle"), t("richPromptBrandDefault")) ||
          t("richPromptBrandDefault");
        insertHtmlAtSelection(
          composeLogoHeaderBlock(logo.trim(), title.trim(), brandAccentColor),
        );
        break;
      }
      case "legal-footer": {
        const text =
          brandLegalFooter?.trim() ||
          window.prompt(t("richPromptLegal"), "") ||
          "";
        if (!text.trim()) {
          return;
        }
        insertHtmlAtSelection(composeLegalFooterBlock(text.trim()));
        break;
      }
      case "image":
        insertRemoteImage();
        return;
      default:
        break;
    }
    syncFromEditor();
  }

  function insertTwoColumns() {
    insertHtmlAtSelection(composeTwoColumnBlock());
    syncFromEditor();
  }

  function insertRemoteImage() {
    const url = window.prompt(t("richPromptImageUrl"));
    if (!url?.trim()) {
      return;
    }
    const alt = window.prompt(t("richPromptImageAlt"), t("richPromptImageAltDefault")) ?? "Görsel";
    insertHtmlAtSelection(composeImageBlock(url.trim(), alt.trim()));
    syncFromEditor();
  }

  function insertCidImage() {
    if (!onInlineImage) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      void onInlineImage(file).then((cid) => {
        if (!cid) {
          return;
        }
        insertHtmlAtSelection(
          `<img src="cid:${cid}" alt="" style="max-width:100%;height:auto" />`,
        );
        syncFromEditor();
      });
    };
    input.click();
  }

  function insertTable() {
    insertHtmlAtSelection(
      '<table class="mail-compose-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>',
    );
    syncFromEditor();
  }

  function insertVideo() {
    const raw = window.prompt(t("richPromptVideoUrl"));
    const url = raw?.trim();
    if (!url) {
      return;
    }
    let embed = url;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtube.com")) {
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
          embed = `https://www.youtube.com/embed/${videoId}`;
        }
      } else if (parsed.hostname === "youtu.be") {
        const videoId = parsed.pathname.replace(/^\//, "");
        if (videoId) {
          embed = `https://www.youtube.com/embed/${videoId}`;
        }
      } else if (parsed.hostname.includes("vimeo.com")) {
        const id = parsed.pathname.split("/").filter(Boolean).pop();
        if (id) {
          embed = `https://player.vimeo.com/video/${id}`;
        }
      }
    } catch {
      /* ham URL */
    }
    const isIframe =
      embed.includes("youtube.com/embed") ||
      embed.includes("player.vimeo.com");
    const html = isIframe
      ? `<div class="mail-compose-video"><iframe src="${embed}" width="560" height="315" frameborder="0" allowfullscreen loading="lazy"></iframe></div><p><br></p>`
      : `<video class="mail-compose-video" controls src="${embed}" style="max-width:100%"></video><p><br></p>`;
    insertHtmlAtSelection(html);
    syncFromEditor();
  }

  if (!enabled) {
    return (
      <label className="mail-rich-toggle compose-rich-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>{t("richToggleEnable")}</span>
      </label>
    );
  }

  return (
    <div className="mail-rich-editor compose-rich-editor compose-rich-editor--premium">
      <div className="compose-rich-head">
        <span className="compose-rich-badge">{t("richBadge")}</span>
        <label className="mail-rich-toggle compose-rich-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span>{t("richClose")}</span>
        </label>
      </div>
      <div
        className="mail-rich-toolbar compose-rich-toolbar"
        role="toolbar"
        aria-label={t("richToolbarAria")}
      >
        <div className="compose-rich-toolbar__row">
          <div className="compose-rich-toolbar__group">
            <ToolbarButton label={t("richBold")} onClick={() => exec("bold")}>
              {icon.bold}
            </ToolbarButton>
            <ToolbarButton label={t("richItalic")} onClick={() => exec("italic")}>
              {icon.italic}
            </ToolbarButton>
            <ToolbarButton label={t("richUnderline")} onClick={() => exec("underline")}>
              {icon.underline}
            </ToolbarButton>
            <ToolbarButton label={t("richStrike")} onClick={() => exec("strikeThrough")}>
              {icon.strike}
            </ToolbarButton>
          </div>
          <ToolbarSep />
          <div className="compose-rich-toolbar__group">
            <ToolbarButton
              label={t("richBulletList")}
              onClick={() => exec("insertUnorderedList")}
            >
              {icon.listBullet}
            </ToolbarButton>
            <ToolbarButton
              label={t("richOrderedList")}
              onClick={() => exec("insertOrderedList")}
            >
              {icon.listOrdered}
            </ToolbarButton>
          </div>
          <ToolbarSep />
          <div className="compose-rich-toolbar__group">
            <ToolbarButton label={t("richLink")} onClick={insertLink}>
              {icon.link}
            </ToolbarButton>
            <ToolbarButton label={t("richDivider")} onClick={insertDivider}>
              {icon.divider}
            </ToolbarButton>
            <ToolbarButton label="HTTPS görsel" onClick={insertRemoteImage}>
              {icon.image}
            </ToolbarButton>
            {onInlineImage ? (
              <ToolbarButton
                label="Satır içi görsel (CID)"
                onClick={insertCidImage}
              >
                {icon.imageInline}
              </ToolbarButton>
            ) : null}
            <ToolbarButton label="2×2 tablo" onClick={insertTable}>
              {icon.table}
            </ToolbarButton>
            <ToolbarButton label="Video embed" onClick={insertVideo}>
              {icon.video}
            </ToolbarButton>
          </div>
        </div>
        <div className="compose-rich-toolbar__row compose-rich-toolbar__row--blocks">
          <label className="compose-rich-block-select-wrap">
            <span className="compose-rich-block-select-label">HTML blok</span>
            <select
              className="compose-rich-block-select"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value as ComposeHtmlBlockId;
                if (!id) {
                  return;
                }
                insertBlockById(id);
                e.target.value = "";
              }}
            >
              <option value="">Kütüphaneden ekle…</option>
              {COMPOSE_HTML_BLOCK_CATALOG.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label}
                </option>
              ))}
            </select>
          </label>
          <div className="compose-rich-toolbar__group">
            <ToolbarButton label="CTA buton" onClick={insertCtaButton}>
              {icon.button}
            </ToolbarButton>
            <ToolbarButton label="Bilgi kutusu" onClick={() => insertCallout("info")}>
              {icon.callout}
            </ToolbarButton>
            <ToolbarButton label="Hero başlık bandı" onClick={insertHero}>
              {icon.hero}
            </ToolbarButton>
            <ToolbarButton label="İki sütun" onClick={insertTwoColumns}>
              {icon.columns}
            </ToolbarButton>
          </div>
          <ToolbarSep />
          <div className="compose-rich-toolbar__group">
            <ToolbarButton
              label="Biçimi temizle"
              onClick={() => {
                exec("removeFormat");
                syncFromEditor();
              }}
            >
              {icon.clear}
            </ToolbarButton>
          </div>
        </div>
      </div>
      <div
        ref={editorRef}
        className="mail-rich-surface compose-rich-surface"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="E-posta gövdesi"
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        suppressContentEditableWarning
      />
    </div>
  );
}
