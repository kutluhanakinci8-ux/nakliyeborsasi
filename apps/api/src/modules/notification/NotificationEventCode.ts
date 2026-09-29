export enum NotificationEventCode {
  UserRegistered = "USER_REGISTERED",
  UserLogin = "USER_LOGIN",
  UserFirstLogin = "USER_FIRST_LOGIN",
  EmailVerification = "EMAIL_VERIFICATION",
  PasswordReset = "PASSWORD_RESET",
  AuctionBidPlaced = "AUCTION_BID_PLACED",
  AuctionOutbid = "AUCTION_OUTBID",
  AuctionWon = "AUCTION_WON",
  AuctionPublished = "AUCTION_PUBLISHED",
  ListingNewOffer = "LISTING_NEW_OFFER",
  MessagingNewMessage = "MESSAGING_NEW_MESSAGE",
  MessagingUserMention = "MESSAGING_USER_MENTION",
  MessagingChatWebPush = "MESSAGING_CHAT_WEB_PUSH",
  MailTeamInvite = "MAIL_TEAM_INVITE",
}

export enum EmailRecipientKind {
  Admin = "ADMIN",
  User = "USER",
}
