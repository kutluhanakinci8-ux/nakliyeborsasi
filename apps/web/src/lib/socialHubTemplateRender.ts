export const SOCIAL_HUB_TEMPLATE_VARIABLE_HINTS = [
  { placeholder: "{{companyName}}", description: "Firma adı" },
  { placeholder: "{{userDisplayName}}", description: "Kullanıcı adı" },
  { placeholder: "{{today}}", description: "Bugünün tarihi" },
] as const;

export function renderSocialHubTemplatePreview(
  bodyText: string,
  sample: {
    companyName?: string;
    userDisplayName?: string;
    today?: string;
  },
): string {
  let rendered = bodyText;
  const vars: Record<string, string> = {
    companyName: sample.companyName ?? "Örnek Lojistik A.Ş.",
    userDisplayName: sample.userDisplayName ?? "Ayşe Yılmaz",
    today:
      sample.today ??
      new Date().toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  };
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
}
