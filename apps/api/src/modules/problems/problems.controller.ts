import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { ProblemsService } from './problems.service';
import { CreateProblemDto, UpdateProblemDto, ProblemQueryDto } from './dto/problem.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Problems')
@Controller('api/v1/problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List problems with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated problem list' })
  async findAll(@Query() query: ProblemQueryDto) {
    const result = await this.problemsService.findAll(query, query.all);
    return { success: true, ...result };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get problem by slug' })
  @ApiParam({ name: 'slug', example: 'two-sum' })
  @ApiResponse({ status: 200, description: 'Problem details with sample test cases' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async findOne(@Param('slug') slug: string) {
    const problem = await this.problemsService.findBySlug(slug);
    return { success: true, data: problem };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new problem (Admin)' })
  @ApiResponse({ status: 201, description: 'Problem created' })
  async create(
    @Body() dto: CreateProblemDto,
    @CurrentUser('id') userId: string,
  ) {
    const problem = await this.problemsService.create(dto, userId);
    return { success: true, data: problem, message: 'Problem created successfully' };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser('id') userId: string,
  ) {
    const problem = await this.problemsService.update(id, dto, userId);
    return { success: true, data: problem, message: 'Problem updated successfully' };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem deleted' })
  async remove(@Param('id') id: string) {
    return { success: true, ...(await this.problemsService.remove(id)) };
  }
}
