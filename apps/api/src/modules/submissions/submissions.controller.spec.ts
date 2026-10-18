import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsController (BOLA & Access Control)', () => {
  let controller: SubmissionsController;
  let submissionsService: any;

  beforeEach(async () => {
    submissionsService = {
      findOne: jest.fn(),
      create: jest.fn(),
      runCode: jest.fn(),
      findAll: jest.fn(),
      findByUserAndProblem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        { provide: SubmissionsService, useValue: submissionsService },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  describe('GET /api/v1/submissions/:id (BOLA Protection)', () => {
    it('should return submission if the user is the owner', async () => {
      const mockSubmission = {
        id: 'sub-1',
        userId: 'user-1',
        problemId: 'prob-1',
        code: 'console.log("hello");',
      };
      submissionsService.findOne.mockResolvedValue(mockSubmission);

      const result = await controller.findOne('sub-1', { id: 'user-1', role: 'user' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
    });

    it('should return submission if caller is an admin', async () => {
      const mockSubmission = {
        id: 'sub-1',
        userId: 'user-1',
        problemId: 'prob-1',
        code: 'console.log("hello");',
      };
      submissionsService.findOne.mockResolvedValue(mockSubmission);

      const result = await controller.findOne('sub-1', { id: 'admin-user', role: 'admin' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
    });

    it('should throw ForbiddenException if user does not own submission and is not admin', async () => {
      const mockSubmission = {
        id: 'sub-1',
        userId: 'user-1',
        problemId: 'prob-1',
        code: 'console.log("hello");',
      };
      submissionsService.findOne.mockResolvedValue(mockSubmission);

      await expect(
        controller.findOne('sub-1', { id: 'user-2', role: 'user' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
