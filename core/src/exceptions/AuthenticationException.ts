import { PlatformException } from "./PlatformException";

export class AuthenticationException extends PlatformException {
  public constructor(message: string) {
    super("AUTHENTICATION_FAILED", message, 401);
  }
}
