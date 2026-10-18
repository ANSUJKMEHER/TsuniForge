import {
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContestTypeEnum } from '../../../database/entities/contest.entity';

export class ContestProblemDto {
  @ApiProperty()
  @IsString()
  problemId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  label: string; // e.g., 'A', 'B', 'C'

  @ApiProperty()
  @IsInt()
  score: number;
}

export class CreateContestDto {
  @ApiProperty({ example: 'Weekly Contest 1' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  descriptionMd: string;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ enum: ContestTypeEnum, default: ContestTypeEnum.RATED })
  @IsEnum(ContestTypeEnum)
  type: ContestTypeEnum;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ type: [ContestProblemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContestProblemDto)
  problems: ContestProblemDto[];
}

export class ContestQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'active', 'past'] })
  @IsOptional()
  @IsEnum(['upcoming', 'active', 'past'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20;
}
