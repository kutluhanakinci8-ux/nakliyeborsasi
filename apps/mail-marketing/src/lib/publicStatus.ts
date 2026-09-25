export type PublicServiceStatus =
  | "operational"
  | "degraded"
  | "major_outage"
  | "maintenance";

export type MailPublicStatusPage = {
  updatedAt: string;
  overall: PublicServiceStatus;
  overallLabelTr: string;
  messageTr: string | null;
  components: {
    id: string;
    nameTr: string;
    status: PublicServiceStatus;
    descriptionTr: string;
  }[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://yonetim.lerta.com.tr/api/v1";

export async function fetchPublicMailStatus(): Promise<MailPublicStatusPage> {
  const response = await fetch(`${API_BASE}/public/lerta-mail/status`, {
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error("status unavailable");
  }
  const payload = (await response.json()) as {
    statusPage: MailPublicStatusPage;
  };
  return payload.statusPage;
}

export function statusLabelTr(status: PublicServiceStatus): string {
  switch (status) {
    case "operational":
      return "Çalışıyor";
    case "degraded":
      return "Kısıtlı";
    case "major_outage":
      return "Kesinti";
    case "maintenance":
      return "Bakım";
  }
}
