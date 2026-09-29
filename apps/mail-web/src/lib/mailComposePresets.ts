import {
  listBuiltinMailComposeTemplateDtos,
  type BuiltinMailComposeTemplate,
} from "@nakliyeborsasi/core";
import type { MailComposePreset } from "./mailApi";

export { BUILTIN_MAIL_COMPOSE_TEMPLATES } from "@nakliyeborsasi/core";
export type { BuiltinMailComposeTemplate };

/** API yanıtı başarısız veya eksikse bile yazım ekranında hazır şablonları göster. */
export function mergeComposeTemplatesWithBuiltins(
  apiTemplates: MailComposePreset[] | undefined | null,
): MailComposePreset[] {
  const builtins = listBuiltinMailComposeTemplateDtos() as MailComposePreset[];
  const fromApi = apiTemplates ?? [];
  const custom = fromApi.filter(
    (row) => !row.isSystem && !row.id.startsWith("builtin:"),
  );
  const apiBuiltins = fromApi.filter(
    (row) => row.isSystem || row.id.startsWith("builtin:"),
  );
  if (apiBuiltins.length > 0) {
    return [...apiBuiltins, ...custom];
  }
  return [...builtins, ...custom];
}

export function builtinComposeTemplatesFallback(): MailComposePreset[] {
  return listBuiltinMailComposeTemplateDtos() as MailComposePreset[];
}
