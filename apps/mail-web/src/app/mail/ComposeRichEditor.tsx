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
      <label className="mail-rich-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Zengin biçim (kalın, italik, bağlantı)
      </label>
    );
  }

  return (
    <div className="mail-rich-editor">
      <label className="mail-rich-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Zengin biçim açık
      </label>
      <div className="mail-rich-toolbar" role="toolbar" aria-label="Biçim">
        <button type="button" onClick={() => exec("bold")}>B</button>
        <button type="button" onClick={() => exec("italic")}>I</button>
        <button type="button" onClick={() => exec("underline")}>U</button>
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
        className="mail-rich-surface"
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
