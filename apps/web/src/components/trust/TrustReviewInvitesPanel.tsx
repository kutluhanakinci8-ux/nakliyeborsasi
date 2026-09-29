"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  TrustReviewInvite,
  TrustScoreApiClient,
} from "../../lib/TrustScoreApiClient";

type TrustReviewInvitesPanelProps = {
  accessToken: string;
  onSelectCompany?: (companyId: string) => void;
};

export function TrustReviewInvitesPanel({
  accessToken,
  onSelectCompany,
}: TrustReviewInvitesPanelProps) {
  const [invites, setInvites] = useState<TrustReviewInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setInvites([]);
      return;
    }
    setLoading(true);
    try {
      const payload = await TrustScoreApiClient.fetchReviewInvites(accessToken);
      setInvites(payload.invites);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function dismiss(inviteId: string): Promise<void> {
    await TrustScoreApiClient.dismissReviewInvite(accessToken, inviteId);
    await refresh();
  }

  if (!accessToken || (!loading && invites.length === 0)) {
    return null;
  }

  return (
    <section className="trust-invites-panel" aria-labelledby="trust-invites-title">
      <div className="trust-invites-panel-head">
        <h2 id="trust-invites-title" className="trust-invites-title">
          Bekleyen değerlendirme istekleri
        </h2>
        <p className="trust-invites-sub">
          Tamamlanan ihalelerden sonra partner firmanızı puanlayın — Timocom tarzı işlem
          sonrası güven döngüsü.
        </p>
      </div>
      {loading ? <p className="trust-invites-loading">Yükleniyor…</p> : null}
      <ul className="trust-invites-list">
        {invites.map((invite) => (
          <li key={invite.id} className="trust-invite-card">
            <div className="trust-invite-card-body">
              <p className="trust-invite-partner">{invite.targetLegalName}</p>
              <p className="trust-invite-context">
                {invite.contextLabel ?? "Tamamlanan iş birliği"}
              </p>
            </div>
            <div className="trust-invite-actions">
              <Link
                href={`/trust?companyId=${encodeURIComponent(invite.targetCompanyId)}`}
                className="btn-accent btn-accent--compact"
                onClick={() => onSelectCompany?.(invite.targetCompanyId)}
              >
                Değerlendir
              </Link>
              <button
                type="button"
                className="btn-link btn-link--compact"
                onClick={() => void dismiss(invite.id)}
              >
                Sonra
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
