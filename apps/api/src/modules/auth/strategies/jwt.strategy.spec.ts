import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { User, UserRoleEnum } from '../../../database/entities/user.entity';

describe('JwtStrategy (SEC-AUTH-04 Active DB & Ban Enforcement)', () => {
  let strategy: JwtStrategy;
  let userRepo: any;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    username: 'testuser',
    email: 'test@tsuniforge.com',
    role: UserRoleEnum.USER,
    profileMetadata: { isActive: true, isBanned: false },
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'JWT_SECRET') return 'super_secret_jwt_key_test_32_chars_long!';
              return def;
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should throw UnauthorizedException if payload does not contain sub', async () => {
    const invalidPayload = {
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: 'user',
    } as unknown as JwtPayload;

    await expect(strategy.validate(invalidPayload)).rejects.toThrow(
      new UnauthorizedException('Invalid token payload'),
    );
  });

  it('should throw UnauthorizedException if user account no longer exists in database', async () => {
    userRepo.findOne.mockResolvedValue(null);
    const payload: JwtPayload = {
      sub: 'deleted-user-uuid',
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: 'user',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('User account no longer exists'),
    );
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'deleted-user-uuid' },
    });
  });

  it('should throw UnauthorizedException if user profile is marked as isBanned', async () => {
    userRepo.findOne.mockResolvedValue({
      ...mockUser,
      profileMetadata: { isBanned: true },
    });
    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: 'user',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('User account is suspended or banned'),
    );
  });

  it('should throw UnauthorizedException if user profile is marked as isActive = false', async () => {
    userRepo.findOne.mockResolvedValue({
      ...mockUser,
      profileMetadata: { isActive: false },
    });
    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: 'user',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('User account is suspended or banned'),
    );
  });

  it('should return sanitized user details when user is valid and active', async () => {
    userRepo.findOne.mockResolvedValue(mockUser);
    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: 'user',
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      id: 'user-uuid-1',
      username: 'testuser',
      email: 'test@tsuniforge.com',
      role: UserRoleEnum.USER,
    });
  });
});
