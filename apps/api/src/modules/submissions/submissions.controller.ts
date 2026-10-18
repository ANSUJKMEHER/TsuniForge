import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, RunCodeDto, SubmissionQueryDto } from './dto/submission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Submissions')
@Controller('api/v1')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submissions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit code for judging' })
  @ApiResponse({ status: 202, description: 'Submission queued for judging' })
  async submit(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.submissionsService.create(dto, userId);
    return { success: true, data: result };
  }

  @Post('run')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run code against custom input (no submission saved)' })
  @ApiResponse({ status: 200, description: 'Code execution result' })
  async runCode(
    @Body() dto: RunCodeDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.submissionsService.runCode(dto, userId);
    return { success: true, data: result };
  }

  @Get('submissions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submission details' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const submission = await this.submissionsService.findOne(id);
    if (submission.userId !== user?.id && user?.role !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission to view this submission',
      );
    }
    return { success: true, data: submission };
  }

  @Get('submissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List submissions with filters' })
  @ApiResponse({ status: 200, description: 'Paginated submissions' })
  async findAll(@Query() query: SubmissionQueryDto) {
    const result = await this.submissionsService.findAll(query);
    return { success: true, ...result };
  }

  @Get('users/:userId/submissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user submissions for a specific problem' })
  async findByUserAndProblem(
    @Param('userId') userId: string,
    @Query('problemId') problemId: string,
  ) {
    const submissions = await this.submissionsService.findByUserAndProblem(
      userId,
      problemId,
    );
    return { success: true, data: submissions };
  }
}
