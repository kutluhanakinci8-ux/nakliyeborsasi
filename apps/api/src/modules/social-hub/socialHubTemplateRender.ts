export const SOCIAL_HUB_TEMPLATE_VARIABLE_KEYS = [
  "companyName",
  "userDisplayName",
  "today",
] as const;

export type SocialHubTemplateVariableKey =
  (typeof SOCIAL_HUB_TEMPLATE_VARIABLE_KEYS)[number];

export function listSocialHubTemplateVariableHints(): Array<{
  key: SocialHubTemplateVariableKey;
  placeholder: string;
  description: string;
}> {
  return [
    {
      key: "companyName",
      placeholder: "{{companyName}}",
      description: "Firma ticari unvanı",
    },
    {
      key: "userDisplayName",
      placeholder: "{{userDisplayName}}",
      description: "Oturum açan kullanıcı adı",
    },
    {
      key: "today",
      placeholder: "{{today}}",
      description: "Bugünün tarihi (tr-TR)",
    },
  ];
}

export function renderSocialHubTemplate(
  bodyText: string,
  variables: Partial<Record<SocialHubTemplateVariableKey, string>>,
): string {
  let rendered = bodyText;
  for (const key of SOCIAL_HUB_TEMPLATE_VARIABLE_KEYS) {
    const value = variables[key];
    if (value === undefined) {
      continue;
    }
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
}

export function formatSocialHubTemplateToday(locale = "tr-TR"): string {
  return new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
