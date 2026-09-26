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
        <span>Zengin biçim (kalın, italik, bağlantı)</span>
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
