"use client";

import { useCallback, useEffect, useState } from "react";
import { useWebSession } from "../../context/WebSessionProvider";

export function usePlatformAdminResource<T>(
  loader: (accessToken: string) => Promise<T>,
): { data: T | null; error: string; reload: () => void; loading: boolean } {
  const { accessToken } = useWebSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    void loader(accessToken)
      .then((result) => setData(result))
      .catch(() => setError("Veri alınamadı. Platform operatörü ile giriş yapın."))
      .finally(() => setLoading(false));
  }, [accessToken, loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload, loading };
}
