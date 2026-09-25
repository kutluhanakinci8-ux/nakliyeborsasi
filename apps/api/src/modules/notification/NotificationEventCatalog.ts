import { NotificationEventCode } from "./NotificationEventCode";

export type UserPreferenceKey =
  | "notifyNewOffers"
  | "notifyMessages"
  | "notifyAuctions"
  | "notifyWeeklyDigest";

export type NotificationEventCategory =
  | "auth"
  | "auction"
  | "listing"
  | "messaging"
  | "digest";

export type NotificationEventDefinition = {
  code: NotificationEventCode;
  category: NotificationEventCategory;
  userPreferenceKey: UserPreferenceKey | null;
  defaultAdminEnabled: boolean;
  defaultUserEnabled: boolean;
  labelTr: string;
};

export const NOTIFICATION_EVENT_CATALOG: NotificationEventDefinition[] = [
  {
    code: NotificationEventCode.UserRegistered,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: true,
    defaultUserEnabled: true,
    labelTr: "Yeni kayıt",
  },
  {
    code: NotificationEventCode.UserLogin,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: false,
    defaultUserEnabled: false,
    labelTr: "Giriş",
  },
  {
    code: NotificationEventCode.UserFirstLogin,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: false,
    defaultUserEnabled: false,
    labelTr: "İlk giriş",
  },
  {
    code: NotificationEventCode.EmailVerification,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: false,
    defaultUserEnabled: true,
    labelTr: "E-posta doğrulama",
  },
  {
    code: NotificationEventCode.PasswordReset,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: false,
    defaultUserEnabled: true,
    labelTr: "Şifre sıfırlama",
  },
  {
    code: NotificationEventCode.MailTeamInvite,
    category: "auth",
    userPreferenceKey: null,
    defaultAdminEnabled: false,
    defaultUserEnabled: true,
    labelTr: "Lerta Mail ekip daveti",
  },
  {
    code: NotificationEventCode.AuctionBidPlaced,
    category: "auction",
    userPreferenceKey: "notifyAuctions",
    defaultAdminEnabled: true,
    defaultUserEnabled: true,
    labelTr: "İhale — yeni teklif",
  },
  {
    code: NotificationEventCode.AuctionOutbid,
    category: "auction",
    userPreferenceKey: "notifyAuctions",
    defaultAdminEnabled: false,
    defaultUserEnabled: true,
    labelTr: "İhale — teklif geçildi",
  },
  {
    code: NotificationEventCode.AuctionWon,
    category: "auction",
    userPreferenceKey: "notifyAuctions",
    defaultAdminEnabled: true,
    defaultUserEnabled: true,
    labelTr: "İhale — kazanan",
  },
  {
    code: NotificationEventCode.AuctionPublished,
    category: "auction",
    userPreferenceKey: "notifyAuctions",
    defaultAdminEnabled: true,
    defaultUserEnabled: true,
    labelTr: "İhale yayınlandı",
  },
  {
    code: NotificationEventCode.ListingNewOffer,
    category: "listing",
    userPreferenceKey: "notifyNewOffers",
    defaultAdminEnabled: true,
    defaultUserEnabled: true,
    labelTr: "Yeni teklif / ilan",
  },
  {
    code: NotificationEventCode.MessagingNewMessage,
    category: "messaging",
    userPreferenceKey: "notifyMessages",
    defaultAdminEnabled: false,
    defaultUserEnabled: true,
    labelTr: "Yeni mesaj",
  },
];

export function resolveEventDefinition(
  code: NotificationEventCode,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_CATALOG.find((row) => row.code === code);
}
