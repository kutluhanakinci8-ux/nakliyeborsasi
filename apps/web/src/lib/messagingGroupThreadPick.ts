import type { MessagingCompanySearchRecord } from "./MessagingApiClient";
import type { MessagingGroupParticipantRole } from "./messagingChatUi";

export type GroupThreadParticipantPick = MessagingCompanySearchRecord & {
  participantRole: MessagingGroupParticipantRole;
};

export function withDefaultGroupRole(
  company: MessagingCompanySearchRecord,
  role: MessagingGroupParticipantRole = "observer",
): GroupThreadParticipantPick {
  return { ...company, participantRole: role };
}

export function groupParticipantRolesRecord(
  picks: GroupThreadParticipantPick[],
): Record<string, MessagingGroupParticipantRole> {
  const out: Record<string, MessagingGroupParticipantRole> = {};
  for (const row of picks) {
    out[row.companyId] = row.participantRole;
  }
  return out;
}
