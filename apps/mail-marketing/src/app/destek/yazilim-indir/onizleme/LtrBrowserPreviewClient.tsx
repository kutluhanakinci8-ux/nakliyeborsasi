"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const SAMPLE_HREF = "/downloads/samples/ornek-teklif.ltr";

export function LtrBrowserPreviewClient() {
  const [src, setSrc] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("");

  const loadSample = useCallback(() => {
    setSrc(SAMPLE_HREF);
    setLabel("Örnek teklif");
  }, []);

  const onFile = useCallback((file: File | null) => {
    if (!file) {
      return;
    }
    setSrc(URL.createObjectURL(file));
    setLabel(file.name);
  }, []);

  const onPrint = useCallback(() => {
    const frame = document.querySelector<HTMLIFrameElement>(
      ".software-dl-preview__frame",
    );
    frame?.contentWindow?.print();
  }, []);

  return (
    <div className="software-dl-preview">
      <p>
        <Link href="/destek/yazilim-indir">← Yazılım indir</Link>
      </p>
      <div className="software-dl-preview__actions">
        <button type="button" className="btn btn-ghost" onClick={loadSample}>
          Örnek teklifi aç
        </button>
        <label className="btn btn-primary software-dl-file-label">
          .ltr seç
          <input
            type="file"
            accept=".ltr,text/html,application/vnd.lerta.document+html"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {src ? (
          <button type="button" className="btn btn-ghost" onClick={onPrint}>
            Yazdır / PDF
          </button>
        ) : null}
      </div>
      {label ? <p className="software-dl-note">{label}</p> : null}
      {src ? (
        <iframe title={label || "LTR önizleme"} src={src} className="software-dl-preview__frame" />
      ) : (
        <p className="software-dl-note">Örnek veya kendi .ltr dosyanızı yükleyin.</p>
      )}
    </div>
  );
}
