import {
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MinLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;
}

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionMd?: string;

  @ApiProperty()
  @IsInt()
  durationMinutes: number;

  @ApiProperty()
  @IsDateString()
  validFrom: string;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty()
  @IsBoolean()
  requireCamera: boolean;

  @ApiProperty()
  @IsBoolean()
  requireScreenShare: boolean;

  @ApiProperty()
  @IsBoolean()
  strictProctoring: boolean; // Flag blur/tab switches

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  problemIds: string[];
}

export class AddCandidateDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class ReportCheatEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiProperty({
    enum: [
      'tab_switch',
      'window_blur',
      'blur',
      'copy_paste',
      'multiple_faces',
      'fullscreen_exit',
    ],
  })
  @IsString()
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class AssessmentAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  language: string;
}

export class SubmitAssessmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiProperty({ type: [AssessmentAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers: AssessmentAnswerDto[];
}
