import { Equals, IsBoolean } from "class-validator";

export class MessagingVoiceTranscribeRequestDto {
  @IsBoolean()
  @Equals(true, { message: "kvkkConsentAcknowledged must be true" })
  public kvkkConsentAcknowledged!: boolean;
}
