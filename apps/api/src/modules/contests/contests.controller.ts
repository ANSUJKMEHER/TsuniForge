import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContestsService } from './contests.service';
import { PlagiarismService } from './plagiarism.service';
import { CreateContestDto, ContestQueryDto } from './dto/contest.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Contests')
@Controller('api/v1/contests')
export class ContestsController {
  constructor(
    private readonly contestsService: ContestsService,
    private readonly plagiarismService: PlagiarismService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List contests (upcoming, active, past)' })
  @ApiResponse({ status: 200, description: 'Paginated contests list' })
  async findAll(@Query() query: ContestQueryDto) {
    const result = await this.contestsService.findAll(query);
    return { success: true, ...result };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get contest details' })
  async findOne(@Param('id') id: string) {
    const contest = await this.contestsService.findOne(id);
    return { success: true, data: contest };
  }

  @Get(':id/problems')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get problems for a contest (if active/registered)' })
  async getContestProblems(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const problems = await this.contestsService.getContestProblems(id, userId);
    return { success: true, data: problems };
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for a contest' })
  async register(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('password') password?: string,
  ) {
    const result = await this.contestsService.register(id, userId, password);
    return { success: true, ...result };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new contest (Admin/Company)' })
  async create(
    @Body() dto: CreateContestDto,
    @CurrentUser('id') userId: string,
  ) {
    const contest = await this.contestsService.create(dto, userId);
    return { success: true, data: contest, message: 'Contest created' };
  }

  @Get(':id/plagiarism')
  @UseGuards(RolesGuard)
  @Roles('admin', 'company')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run plagiarism scan on all AC submissions in a contest (Admin/Company)' })
  async checkPlagiarism(@Param('id') id: string) {
    const report = await this.plagiarismService.runContestScan(id);
    return { success: true, data: report };
  }
}
