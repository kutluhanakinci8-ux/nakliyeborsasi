import { PlatformException } from "./PlatformException";

export class MessagingThreadNotFoundException extends PlatformException {
  public constructor(threadId: string) {
    super(
      "MESSAGING_THREAD_NOT_FOUND",
      `Messaging thread not found: ${threadId}`,
      404,
    );
  }
}
