"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 520 }}>
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Sayfa yüklenemedi</h1>
        <p style={{ color: "#475569", lineHeight: 1.5 }}>
          Oturum açıkken deploy sonrası eski önbellek kalabilir. Sayfayı yenileyin; sorun devam
          ederse çıkış yapıp tekrar giriş yapın.
        </p>
        {error?.message ? (
          <pre
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#f1f5f9",
              fontSize: "0.75rem",
              overflow: "auto",
            }}
          >
            {error.message}
          </pre>
        ) : null}
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              background: "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              background: "#e2e8f0",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
