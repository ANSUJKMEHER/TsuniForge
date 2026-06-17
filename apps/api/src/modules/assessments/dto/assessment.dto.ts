import {
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
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
}

export class ReportCheatEventDto {
  @ApiProperty({ enum: ['tab_switch', 'window_blur', 'copy_paste', 'multiple_faces'] })
  @IsEnum(['tab_switch', 'window_blur', 'copy_paste', 'multiple_faces'])
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}
