import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class MessagingVoiceTranscriptEditRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  public editedText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  public languageCode?: string;
}
