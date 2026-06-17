import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { 
  CreateCompanyDto, 
  CreateAssessmentDto, 
  AddCandidateDto,
  ReportCheatEventDto
} from './dto/assessment.dto';

@ApiTags('Assessments & Companies')
@Controller('api/v1')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  // ─── Company Admin Routes ───────────────────

  @Post('companies')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a company profile' })
  async createCompany(@Body() dto: CreateCompanyDto, @CurrentUser('id') userId: string) {
    const company = await this.assessmentsService.createCompany(dto, userId);
    return { success: true, data: company };
  }

  @Post('assessments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an assessment' })
  async createAssessment(@Body() dto: CreateAssessmentDto, @CurrentUser('id') userId: string) {
    const assessment = await this.assessmentsService.createAssessment(dto, userId);
    return { success: true, data: assessment };
  }

  @Get('companies/:companyId/assessments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assessments for a company' })
  async getCompanyAssessments(@Param('companyId') companyId: string) {
    const assessments = await this.assessmentsService.getCompanyAssessments(companyId);
    return { success: true, data: assessments };
  }

  @Post('assessments/:id/candidates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a candidate to an assessment' })
  async addCandidate(
    @Param('id') id: string,
    @Body() dto: AddCandidateDto,
    @CurrentUser('id') userId: string,
  ) {
    const candidate = await this.assessmentsService.addCandidate(id, dto, userId);
    return { success: true, data: candidate };
  }

  @Get('assessments/:id/candidates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidates and reports for an assessment' })
  async getCandidates(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const candidates = await this.assessmentsService.getCandidates(id, userId);
    return { success: true, data: candidates };
  }

  // ─── Candidate Routes ───────────────────────

  @Get('assessments/:id/session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current candidate session status' })
  async getSession(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const session = await this.assessmentsService.getCandidateSession(id, userId);
    return { success: true, data: session };
  }

  @Post('assessments/:id/start')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start the assessment timer' })
  async startAssessment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const session = await this.assessmentsService.startAssessment(id, userId);
    return { success: true, data: session };
  }

  @Post('assessments/:id/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize and submit the assessment' })
  async completeAssessment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const session = await this.assessmentsService.completeAssessment(id, userId);
    return { success: true, data: session };
  }

  @Post('assessments/:id/cheat-event')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a proctoring/cheat event' })
  async reportCheatEvent(
    @Param('id') id: string,
    @Body() dto: ReportCheatEventDto,
    @CurrentUser('id') userId: string,
  ) {
    const session = await this.assessmentsService.reportCheatEvent(id, userId, dto);
    return { success: true, data: session };
  }
}
