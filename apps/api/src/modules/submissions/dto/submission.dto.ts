import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-of-problem' })
  @IsString()
  problemId: string;

  @ApiProperty({ enum: ['cpp', 'java', 'python'] })
  @IsEnum(['cpp', 'java', 'python'])
  language: string;

  @ApiProperty({ example: '#include <bits/stdc++.h>...' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'uuid-of-contest' })
  @IsOptional()
  @IsString()
  contestId?: string;
}

export class RunCodeDto {
  @ApiProperty()
  @IsString()
  problemId: string;

  @ApiProperty({ enum: ['cpp', 'java', 'python'] })
  @IsEnum(['cpp', 'java', 'python'])
  language: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ example: '5\n1 2 3 4 5' })
  @IsString()
  customInput: string;
}

export class SubmissionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: ['cpp', 'java', 'python'] })
  @IsOptional()
  @IsEnum(['cpp', 'java', 'python'])
  language?: string;

  @ApiPropertyOptional({ enum: ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'] })
  @IsOptional()
  @IsString()
  verdict?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
