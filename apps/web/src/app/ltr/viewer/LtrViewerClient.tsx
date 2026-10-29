"use client";

import { useCallback, useMemo, useState } from "react";
import {
  extractLtrManifestJsonFromHtml,
  renderLtrDocumentHtml,
  validateLtrManifest,
  type LtrManifest,
} from "@nakliyeborsasi/core";

const SAMPLE_HREF = "/ltr/samples/ornek-teklif.ltr";

type LoadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; manifest: LtrManifest; html: string; sourceLabel: string };

function parseLtrFileContents(text: string, sourceLabel: string): LoadState {
  const json = extractLtrManifestJsonFromHtml(text);
  if (!json) {
    return { status: "error", message: "Manifest bulunamadı (ltr-content)." };
  }
  const validated = validateLtrManifest(json);
  if (!validated.ok) {
    return {
      status: "error",
      message: validated.issues.map((i) => i.message).join(" · "),
    };
  }
  return {
    status: "ready",
    manifest: validated.manifest,
    html: renderLtrDocumentHtml(validated.manifest),
    sourceLabel,
  };
}

export function LtrViewerClient() {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch(SAMPLE_HREF);
      if (!res.ok) {
        setState({ status: "error", message: "Örnek dosya yüklenemedi." });
        return;
      }
      const text = await res.text();
      setState(parseLtrFileContents(text, "Örnek teklif"));
    } catch {
      setState({ status: "error", message: "Ağ hatası." });
    }
  }, []);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setState(parseLtrFileContents(text, file.name));
    } catch {
      setState({ status: "error", message: "Dosya okunamadı." });
    }
  }, []);

  const printPdfHint = useMemo(
    () =>
      state.status === "ready"
        ? () => {
            const w = window.open("", "_blank");
            if (!w) {
              return;
            }
            w.document.write(state.html);
            w.document.close();
            w.focus();
            w.print();
          }
        : undefined,
    [state],
  );

  return (
    <div className="about-premium-section" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <button type="button" className="about-premium-cta-secondary" onClick={() => void loadSample()}>
          Örnek teklifi aç
        </button>
        <label className="about-premium-cta-secondary" style={{ cursor: "pointer" }}>
          .ltr dosyası seç
          <input
            type="file"
            accept=".ltr,application/vnd.lerta.document+html,text/html"
            style={{ display: "none" }}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {printPdfHint ? (
          <button type="button" className="about-premium-cta-primary" onClick={printPdfHint}>
            Yazdır / PDF
          </button>
        ) : null}
      </div>

      {state.status === "error" ? (
        <p role="alert" style={{ color: "crimson" }}>
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            Kaynak: {state.sourceLabel} · {state.manifest.title}
          </p>
          <iframe
            title={state.manifest.title}
            sandbox="allow-same-origin"
            srcDoc={state.html}
            style={{
              width: "100%",
              minHeight: 640,
              border: "1px solid var(--border-subtle, #dfe3ea)",
              borderRadius: 8,
            }}
          />
        </>
      ) : state.status === "idle" ? (
        <p>Örnek teklifi açın veya bilgisayarınızdan bir `.ltr` dosyası seçin.</p>
      ) : null}
    </div>
  );
}
