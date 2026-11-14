import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePaperDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  examName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subjectCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  academicYear!: string;
}
