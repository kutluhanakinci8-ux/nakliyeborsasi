"use client";

import { useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { useWebSession } from "../../../context/WebSessionProvider";
import { IntegrationApiClient } from "../../../lib/IntegrationApiClient";

export function IntegrationsPageClient() {
  const { accessToken, locale } = useWebSession();
  const [preview, setPreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleLoad(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await IntegrationApiClient.fetchExternalOffers(
        accessToken,
        locale,
      );
      setPreview(JSON.stringify(payload, null, 2));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Entegrasyon hatası");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Harici kaynaklar"
        description="Lardi, DAT, Truckstop ve diğer adapter özetleri"
        action={
          <button type="button" className="btn-primary" onClick={() => void handleLoad()} disabled={isBusy}>
            {isBusy ? "..." : "Yükle"}
          </button>
        }
      />
      {errorMessage ? <p className="error banner">{errorMessage}</p> : null}
      {!preview ? (
        <EmptyState message="Harici teklifleri görmek için Yükle'ye tıklayın." />
      ) : (
        <pre className="code-block">{preview}</pre>
      )}
    </>
  );
}
