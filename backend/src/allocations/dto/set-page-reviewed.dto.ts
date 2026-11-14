import { IsBoolean } from 'class-validator';

export class SetPageReviewedDto {
  @IsBoolean()
  isReviewed!: boolean;
}
