import { useCallback, useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  extractLtrManifestJsonFromHtml,
  renderLtrDocumentHtml,
  validateLtrManifest,
  type LtrManifest,
} from "@nakliyeborsasi/core";

type ViewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; manifest: LtrManifest; html: string; label: string };

function parseLtr(text: string, label: string): ViewState {
  const json = extractLtrManifestJsonFromHtml(text);
  if (!json) {
    return { status: "error", message: "Geçerli LTR manifest bulunamadı." };
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
    label,
  };
}

async function readPath(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export function WinLrtApp() {
  const [state, setState] = useState<ViewState>({ status: "idle" });

  const openFile = useCallback(async (path?: string) => {
    try {
      let filePath = path;
      if (!filePath) {
        const picked = await open({
          multiple: false,
          filters: [{ name: "Lerta Document", extensions: ["ltr"] }],
        });
        if (!picked || typeof picked !== "string") {
          return;
        }
        filePath = picked;
      }
      const text = await readPath(filePath);
      setState(parseLtr(text, filePath.split(/[/\\]/).pop() ?? filePath));
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Dosya açılamadı.",
      });
    }
  }, []);

  useEffect(() => {
    void invoke<string[]>("cli_open_paths").then((paths) => {
      if (paths[0]) {
        void openFile(paths[0]);
      }
    });
  }, [openFile]);

  const onPrint = useMemo(() => {
    if (state.status !== "ready") {
      return undefined;
    }
    return () => {
      const frame = document.querySelector<HTMLIFrameElement>(".viewer");
      frame?.contentWindow?.print();
    };
  }, [state]);

  return (
    <div className="shell">
      <header className="toolbar">
        <button type="button" className="primary" onClick={() => void openFile()}>
          .ltr aç
        </button>
        {onPrint ? (
          <button type="button" onClick={onPrint}>
            Yazdır / PDF
          </button>
        ) : null}
        {state.status === "ready" ? (
          <span className="meta">
            {state.label} · {state.manifest.title}
          </span>
        ) : null}
      </header>
      {state.status === "error" ? <p className="error">{state.message}</p> : null}
      {state.status === "ready" ? (
        <iframe
          className="viewer"
          title={state.manifest.title}
          sandbox="allow-same-origin allow-modals"
          srcDoc={state.html}
        />
      ) : state.status === "idle" ? (
        <p style={{ padding: "1rem", color: "var(--muted)" }}>
          WinLRT — Lerta Document (.ltr) görüntüleyici. Dosya açın veya .ltr dosyasına çift
          tıklayın.
        </p>
      ) : null}
    </div>
  );
}
