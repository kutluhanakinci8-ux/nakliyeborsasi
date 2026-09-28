"use client";

import { useEffect, useRef } from "react";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  plainText: string;
  onPlainTextChange: (text: string) => void;
  onHtmlChange: (html: string) => void;
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

export function ComposeRichEditor({
  enabled,
  onEnabledChange,
  plainText,
  onPlainTextChange,
  onHtmlChange,
}: Props) {
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

  if (!enabled) {
    return (
      <label className="mail-rich-toggle compose-rich-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>Zengin biçim (kalın, tablo, video)</span>
      </label>
    );
  }

  return (
    <div className="mail-rich-editor compose-rich-editor">
      <div className="compose-rich-head">
        <span className="compose-rich-badge">Zengin metin</span>
        <label className="mail-rich-toggle compose-rich-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span>Kapat</span>
        </label>
      </div>
      <div className="mail-rich-toolbar compose-rich-toolbar" role="toolbar" aria-label="Biçim">
        <button type="button" onClick={() => exec("bold")} title="Kalın">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => exec("italic")} title="İtalik">
          <em>I</em>
        </button>
        <button type="button" onClick={() => exec("underline")} title="Altı çizili">
          <span className="compose-u">U</span>
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} title="Madde işaretli liste">
          • Liste
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} title="Numaralı liste">
          1. Liste
        </button>
        <button type="button" onClick={() => exec("strikeThrough")} title="Üstü çizili">
          <s>S</s>
        </button>
        <button type="button" onClick={() => exec("removeFormat")} title="Biçimi temizle">
          Temizle
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Bağlantı URL");
            if (url?.trim()) {
              exec("createLink", url.trim());
            }
          }}
        >
          Link
        </button>
        <button
          type="button"
          title="2×2 tablo"
          onClick={() => {
            insertHtmlAtSelection(
              '<table class="mail-compose-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>',
            );
            syncFromEditor();
          }}
        >
          Tablo
        </button>
        <button
          type="button"
          title="Video embed (YouTube/Vimeo URL)"
          onClick={() => {
            const raw = window.prompt("Video URL (YouTube, Vimeo veya doğrudan mp4)");
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
              // Ham URL kullan.
            }
            const isIframe =
              embed.includes("youtube.com/embed") ||
              embed.includes("player.vimeo.com");
            const html = isIframe
              ? `<div class="mail-compose-video"><iframe src="${embed}" width="560" height="315" frameborder="0" allowfullscreen loading="lazy"></iframe></div><p><br></p>`
              : `<video class="mail-compose-video" controls src="${embed}" style="max-width:100%"></video><p><br></p>`;
            insertHtmlAtSelection(html);
            syncFromEditor();
          }}
        >
          Video
        </button>
      </div>
      <div
        ref={editorRef}
        className="mail-rich-surface compose-rich-surface"
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        suppressContentEditableWarning
      />
    </div>
  );
}
