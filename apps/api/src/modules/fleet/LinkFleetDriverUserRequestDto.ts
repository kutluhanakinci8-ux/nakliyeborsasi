import { IsEmail } from "class-validator";

export class LinkFleetDriverUserRequestDto {
  @IsEmail()
  public emailAddress!: string;
}
