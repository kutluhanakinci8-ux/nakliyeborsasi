import { IsBoolean } from "class-validator";

export class SetMessageStarredRequestDto {
  @IsBoolean()
  public starred!: boolean;
}
