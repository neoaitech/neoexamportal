import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SchemeStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxMarks!: number;
}

export class SchemeQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  questionNumber!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxMarks!: number;

  // Questions sharing an optionGroup are "attempt exactly one" alternatives.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  optionGroup?: string | null;

  // Omit for a single "whole question" step.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SchemeStepDto)
  steps?: SchemeStepDto[];
}

export class SetSchemeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SchemeQuestionDto)
  questions!: SchemeQuestionDto[];
}
