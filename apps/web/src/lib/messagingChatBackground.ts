export type ChatConversationBackgroundId =
  | "default"
  | "brand"
  | "slate"
  | "sand"
  | "sky"
  | "lavender"
  | "grid"
  | "night";

export type ChatConversationBackgroundOption = {
  id: ChatConversationBackgroundId;
  label: string;
  description: string;
  /** Küçük önizleme rengi (swatch) */
  preview: string;
};

export const CHAT_CONVERSATION_BACKGROUNDS: ChatConversationBackgroundOption[] =
  [
    {
      id: "default",
      label: "Beyaz",
      description: "Varsayılan açık zemin",
      preview: "linear-gradient(135deg, #ffffff, #f8fafc)",
    },
    {
      id: "brand",
      label: "Lerta yeşil",
      description: "Yumuşak marka tonu",
      preview: "linear-gradient(160deg, #ecfdf5, #d1fae5)",
    },
    {
      id: "slate",
      label: "Gri",
      description: "Nötr soğuk gri",
      preview: "linear-gradient(160deg, #f1f5f9, #e2e8f0)",
    },
    {
      id: "sand",
      label: "Kum",
      description: "Sıcak bej ton",
      preview: "linear-gradient(160deg, #fffbeb, #fef3c7)",
    },
    {
      id: "sky",
      label: "Gökyüzü",
      description: "Açık mavi",
      preview: "linear-gradient(160deg, #f0f9ff, #e0f2fe)",
    },
    {
      id: "lavender",
      label: "Lila",
      description: "Hafif mor",
      preview: "linear-gradient(160deg, #f5f3ff, #ede9fe)",
    },
    {
      id: "grid",
      label: "Izgara",
      description: "Hafif kılavuz çizgiler",
      preview: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
    },
    {
      id: "night",
      label: "Koyu",
      description: "Göz yormayan koyu mod",
      preview: "linear-gradient(160deg, #1e293b, #0f172a)",
    },
  ];

const STORAGE_KEY = "lerta.messaging.chatBackground";

export function readStoredChatBackground(): ChatConversationBackgroundId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (
      CHAT_CONVERSATION_BACKGROUNDS.some((row) => row.id === raw)
    ) {
      return raw as ChatConversationBackgroundId;
    }
  } catch {
    /* ignore */
  }
  return "default";
}

export function rememberChatBackground(
  id: ChatConversationBackgroundId,
): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function chatBackgroundLabel(
  id: ChatConversationBackgroundId,
): string {
  return (
    CHAT_CONVERSATION_BACKGROUNDS.find((row) => row.id === id)?.label ??
    "Beyaz"
  );
}
