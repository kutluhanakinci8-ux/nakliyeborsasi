import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class SubmitCompanyTrustReviewRequestDto {
  @IsInt()
  @Min(1)
  @Max(5)
  public scoreValue!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  public commentText!: string;
}
