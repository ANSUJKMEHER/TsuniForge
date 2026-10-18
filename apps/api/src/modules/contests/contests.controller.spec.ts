import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { LeaderboardService } from './leaderboard.service';
import { PlagiarismService } from './plagiarism.service';

describe('ContestsController (Plagiarism Authorization Audit)', () => {
  let controller: ContestsController;
  let contestsService: any;
  let leaderboardService: any;
  let plagiarismService: any;

  beforeEach(async () => {
    contestsService = {
      findOne: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      register: jest.fn(),
      getContestProblems: jest.fn(),
    };

    leaderboardService = {
      getLeaderboard: jest.fn(),
    };

    plagiarismService = {
      runContestScan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContestsController],
      providers: [
        { provide: ContestsService, useValue: contestsService },
        { provide: LeaderboardService, useValue: leaderboardService },
        { provide: PlagiarismService, useValue: plagiarismService },
      ],
    }).compile();

    controller = module.get<ContestsController>(ContestsController);
  });

  describe('GET /api/v1/contests/:id/plagiarism', () => {
    it('should allow contest creator to run plagiarism scan', async () => {
      contestsService.findOne.mockResolvedValue({
        id: 'contest-1',
        title: 'Weekly Contest',
        createdBy: 'company-user-1',
      });
      plagiarismService.runContestScan.mockResolvedValue({
        contestId: 'contest-1',
        matches: [],
      });

      const result = await controller.checkPlagiarism('contest-1', {
        id: 'company-user-1',
        role: 'company',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should allow platform admin to run plagiarism scan on any contest', async () => {
      contestsService.findOne.mockResolvedValue({
        id: 'contest-1',
        title: 'Weekly Contest',
        createdBy: 'company-user-1',
      });
      plagiarismService.runContestScan.mockResolvedValue({
        contestId: 'contest-1',
        matches: [],
      });

      const result = await controller.checkPlagiarism('contest-1', {
        id: 'admin-user-1',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if company user does not own the contest', async () => {
      contestsService.findOne.mockResolvedValue({
        id: 'contest-1',
        title: 'Weekly Contest',
        createdBy: 'company-user-1',
      });

      await expect(
        controller.checkPlagiarism('contest-1', {
          id: 'company-user-2',
          role: 'company',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
