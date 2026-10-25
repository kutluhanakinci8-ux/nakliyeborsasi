import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const TOPICS = ["demo", "support", "press", "partner", "career"] as const;

export class PublicPlatformContactRequestDto {
  @IsString()
  @MaxLength(120)
  public name!: string;

  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  public company?: string;

  @IsIn(TOPICS)
  public topic!: (typeof TOPICS)[number];

  @IsString()
  @MaxLength(8000)
  public message!: string;
}
