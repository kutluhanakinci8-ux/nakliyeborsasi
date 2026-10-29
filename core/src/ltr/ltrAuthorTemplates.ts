import { LTR_SCHEMA_ID } from "./ltrConstants";
import type { LtrManifest } from "./ltrManifestTypes";

export type LtrAuthorTemplateId = "teklif" | "kapasite" | "rota";

export type LtrAuthorCreateOptions = {
  title?: string;
  subtitle?: string;
  author?: string;
  organization?: string;
};

export type LtrAuthorTemplate = {
  id: LtrAuthorTemplateId;
  name: string;
  description: string;
  vitrinPath: string;
  create: (options?: LtrAuthorCreateOptions) => LtrManifest;
};

function defaultMeta(options?: LtrAuthorCreateOptions) {
  return {
    author: options?.author ?? "WinLRT Author",
    organization: options?.organization ?? "Lerta",
    createdAt: new Date().toISOString(),
    generator: "WinLRT Author v1",
  };
}

const teklifTemplate: LtrAuthorTemplate = {
  id: "teklif",
  name: "Taşıma teklifi",
  description: "Güzergah, KPI ve kalem tablosu — kapalı teklif paketi.",
  vitrinPath: "/downloads/samples/sablon-teklif.ltr",
  create: (options) => ({
    schema: LTR_SCHEMA_ID,
    lang: "tr",
    mode: "sealed",
    title: options?.title ?? "Taşıma teklifi",
    subtitle: options?.subtitle ?? "Yükleme → Boşaltma",
    meta: defaultMeta(options),
    blocks: [
      {
        type: "callout",
        tone: "info",
        text: "Bu belge WinLRT Author ile oluşturuldu. Müşteriye .ltr olarak gönderilebilir.",
      },
      {
        type: "kpis",
        items: [
          { value: "—", label: "Teklif", delta: "KDV hariç" },
          { value: "—", label: "Transit" },
          { value: "FTL", label: "Araç" },
        ],
      },
      {
        type: "markdown",
        md: "## Güzergah\n- **Yükleme:** \n- **Boşaltma:** \n\n## Koşullar\nCMR ve yazılı teyit.",
      },
      {
        type: "table",
        title: "Kalemler",
        columns: ["Kalem", "Tutar"],
        rows: [
          ["Taşıma bedeli", "—"],
          ["Ek hizmetler", "—"],
        ],
      },
    ],
  }),
};

const kapasiteTemplate: LtrAuthorTemplate = {
  id: "kapasite",
  name: "Kapasite bildirimi",
  description: "Boş / dolu kapasite, araç tipi ve bölge özeti.",
  vitrinPath: "/downloads/samples/sablon-kapasite.ltr",
  create: (options) => ({
    schema: LTR_SCHEMA_ID,
    lang: "tr",
    mode: "sealed",
    title: options?.title ?? "Kapasite bildirimi",
    subtitle: options?.subtitle ?? "Bölge · Araç tipi",
    meta: defaultMeta(options),
    blocks: [
      {
        type: "callout",
        tone: "ok",
        text: "Boş kapasite veya yük arayan taraf için hızlı özet.",
      },
      {
        type: "kpis",
        items: [
          { value: "—", label: "Boş km" },
          { value: "—", label: "Tonnaj" },
          { value: "TIR", label: "Tip" },
        ],
      },
      {
        type: "markdown",
        md: "## Konum\n- **Çıkış:** \n- **Varış tercihi:** \n\n## Zaman\nYükleme penceresi: —",
      },
      {
        type: "table",
        title: "Özellikler",
        columns: ["Alan", "Değer"],
        rows: [
          ["ADR", "Hayır"],
          ["Frigo", "Hayır"],
          ["Lift", "—"],
        ],
      },
    ],
  }),
};

const rotaTemplate: LtrAuthorTemplate = {
  id: "rota",
  name: "Rota özeti",
  description: "Duraklar, mesafe ve süre tahmini.",
  vitrinPath: "/downloads/samples/sablon-rota.ltr",
  create: (options) => ({
    schema: LTR_SCHEMA_ID,
    lang: "tr",
    mode: "sealed",
    title: options?.title ?? "Rota özeti",
    subtitle: options?.subtitle ?? "Çok duraklı sefer",
    meta: defaultMeta(options),
    blocks: [
      {
        type: "callout",
        tone: "info",
        text: "Operasyon veya müşteri bilgilendirmesi için rota kartı.",
      },
      {
        type: "kpis",
        items: [
          { value: "— km", label: "Mesafe" },
          { value: "— s", label: "Süre" },
          { value: "—", label: "Durak" },
        ],
      },
      {
        type: "markdown",
        md: "## Duraklar\n1. \n2. \n3. \n\n## Notlar\nTrafik / sınır geçiş süreleri dahil değildir.",
      },
      {
        type: "quote",
        text: "Rota bilgisi bilgilendirme amaçlıdır; nihai plan operasyon onayı ile kesinleşir.",
        cite: "WinLRT Author",
      },
    ],
  }),
};

export const LTR_AUTHOR_TEMPLATES: LtrAuthorTemplate[] = [
  teklifTemplate,
  kapasiteTemplate,
  rotaTemplate,
];

export function getLtrAuthorTemplate(id: LtrAuthorTemplateId): LtrAuthorTemplate | undefined {
  return LTR_AUTHOR_TEMPLATES.find((t) => t.id === id);
}

export function createLtrFromAuthorTemplate(
  id: LtrAuthorTemplateId,
  options?: LtrAuthorCreateOptions,
): LtrManifest {
  const template = getLtrAuthorTemplate(id);
  if (!template) {
    throw new Error(`Bilinmeyen şablon: ${id}`);
  }
  return template.create(options);
}
