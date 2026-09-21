import { PlatformException } from "./PlatformException";

export class AuthorizationException extends PlatformException {
  public constructor(message: string) {
    super("AUTHORIZATION_DENIED", message, 403);
  }
}
