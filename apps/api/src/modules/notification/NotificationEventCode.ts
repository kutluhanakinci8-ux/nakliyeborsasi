export enum NotificationEventCode {
  UserRegistered = "USER_REGISTERED",
  UserLogin = "USER_LOGIN",
  UserFirstLogin = "USER_FIRST_LOGIN",
  EmailVerification = "EMAIL_VERIFICATION",
  PasswordReset = "PASSWORD_RESET",
}

export enum EmailRecipientKind {
  Admin = "ADMIN",
  User = "USER",
}
