import { useCallback, useEffect, useMemo, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  createLtrFromAuthorTemplate,
  extractLtrManifestJsonFromHtml,
  LTR_AUTHOR_TEMPLATES,
  renderLtrDocumentHtml,
  sealLtrDocumentHtml,
  validateLtrManifest,
  type LtrAuthorTemplateId,
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

  const createFromTemplate = useCallback((id: LtrAuthorTemplateId) => {
    const title = window.prompt("Belge başlığı (isteğe bağlı)")?.trim();
    const manifest = createLtrFromAuthorTemplate(id, title ? { title } : undefined);
    const html = renderLtrDocumentHtml(manifest);
    setState({
      status: "ready",
      manifest,
      html,
      label: `sablon-${id}.ltr`,
    });
  }, []);

  const saveDocument = useCallback(async () => {
    if (state.status !== "ready") {
      return;
    }
    try {
      const sealed = sealLtrDocumentHtml(state.manifest);
      const defaultName = state.label.endsWith(".ltr") ? state.label : `${state.label}.ltr`;
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Lerta Document", extensions: ["ltr"] }],
      });
      if (!path || typeof path !== "string") {
        return;
      }
      await invoke("write_text_file", { path, contents: sealed });
      setState(parseLtr(sealed, path.split(/[/\\]/).pop() ?? path));
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Kaydedilemedi.",
      });
    }
  }, [state]);

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
        <button type="button" onClick={() => void saveDocument()} disabled={state.status !== "ready"}>
          Kaydet
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
      <div className="author-bar">
        <span className="author-bar__label">Author v1 — şablon:</span>
        {LTR_AUTHOR_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="author-chip" onClick={() => createFromTemplate(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
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
          WinLRT — LTR görüntüleyici ve Author v1. Şablondan yeni belge oluşturun veya .ltr açın.
        </p>
      ) : null}
    </div>
  );
}
