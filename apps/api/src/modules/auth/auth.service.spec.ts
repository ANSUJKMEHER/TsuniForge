import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRoleEnum } from '../../database/entities/user.entity';

describe('AuthService (Milestone 2 Security Audit)', () => {
  let service: AuthService;
  let userRepo: any;
  let jwtService: any;
  let configService: any;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    username: 'testuser',
    email: 'test@tsuniforge.com',
    passwordHash: '$2b$12$dummyhash',
    role: UserRoleEnum.USER,
    refreshToken: '',
    profileMetadata: {},
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'new-user-uuid' })),
      save: jest.fn((u) => Promise.resolve({ ...u, id: u.id || 'new-user-uuid' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'JWT_SECRET') return 'super_secret_jwt_key_test_32_chars_long!';
        if (key === 'JWT_REFRESH_SECRET') return 'super_secret_refresh_key_test_32_chars!';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('SEC-AUTH-01: OAuth Auto-Linking Prevention', () => {
    it('should throw ConflictException if an account with the email already exists and is not linked', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // no user with matching oauthProvider + oauthId
        .mockResolvedValueOnce({ ...mockUser }); // existing user with this email

      await expect(
        service.oauthLogin('github', {
          id: 'gh-999',
          email: 'test@tsuniforge.com',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should proceed and return tokens if OAuth identifier is already linked', async () => {
      const linkedUser = {
        ...mockUser,
        oauthProvider: 'github',
        oauthId: 'gh-123',
      };
      userRepo.findOne.mockResolvedValueOnce(linkedUser);

      const result = await service.oauthLogin('github', {
        id: 'gh-123',
        email: 'test@tsuniforge.com',
        displayName: 'Test User',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });

  describe('SEC-AUTH-02: Production JWT Secret Assertion', () => {
    it('should throw Error on init in production if JWT_SECRET is weak or dev fallback', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'tsuniforge_jwt_secret_dev';
        return 'dev';
      });

      expect(() => service.onModuleInit()).toThrow(
        /Fatal security configuration error: JWT_SECRET must be at least 32 characters long in production./,
      );
    });

    it('should throw Error on init in production if JWT_REFRESH_SECRET is weak or dev fallback', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'super_secret_jwt_key_test_32_chars_long!';
        if (key === 'JWT_REFRESH_SECRET') return 'tsuniforge_refresh_secret_dev';
        return 'dev';
      });

      expect(() => service.onModuleInit()).toThrow(
        /Fatal security configuration error: JWT_REFRESH_SECRET must be at least 32 characters long in production./,
      );
    });

    it('should throw Error on init in production if JWT_REFRESH_SECRET is shorter than 32 characters', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'super_secret_jwt_key_test_32_chars_long!';
        if (key === 'JWT_REFRESH_SECRET') return 'short_secret';
        return 'dev';
      });

      expect(() => service.onModuleInit()).toThrow(
        /Fatal security configuration error: JWT_REFRESH_SECRET must be at least 32 characters long in production./,
      );
    });
  });

  describe('SEC-AUTH-03: Refresh Token 30s Concurrency Grace Window & Rotation', () => {
    it('should rotate refresh token and persist previous hash on valid refresh request', async () => {
      const currentToken = 'current-refresh-token';
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });

      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: hashedCurrentToken,
        profileMetadata: {},
      });

      const result = await service.refreshTokens({ refreshToken: currentToken });
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          refreshToken: expect.any(String),
          profileMetadata: expect.objectContaining({
            previousRefreshToken: hashedCurrentToken,
            tokenRotatedAt: expect.any(Number),
          }),
        }),
      );
    });

    it('should permit concurrent refresh requests presenting previous token within 30s', async () => {
      const currentToken = 'current-refresh-token';
      const prevToken = 'prev-refresh-token';
      const hashedPrevToken = await bcrypt.hash(prevToken, 10);
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });

      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: hashedPrevToken,
          tokenRotatedAt: Date.now() - 5000, // 5 seconds ago (< 30s)
        },
      });

      // Request presenting the previous token within grace window
      const result = await service.refreshTokens({ refreshToken: prevToken });
      expect(result.accessToken).toBe('mock-token');
    });

    it('should invalidate session if previous token is reused outside grace window', async () => {
      const currentToken = 'current-refresh-token';
      const prevToken = 'prev-refresh-token';
      const hashedPrevToken = await bcrypt.hash(prevToken, 10);
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });

      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: hashedPrevToken,
          tokenRotatedAt: Date.now() - 40000, // 40 seconds ago (> 30s)
        },
      });

      await expect(
        service.refreshTokens({ refreshToken: prevToken }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify breach detection invalidated refresh token
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ refreshToken: '' }),
      );
    });

    it('should return current valid session tokens during grace window if stored', async () => {
      const currentToken = 'current-refresh-token';
      const prevToken = 'prev-refresh-token';
      const hashedPrevToken = await bcrypt.hash(prevToken, 10);
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });

      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: hashedPrevToken,
          tokenRotatedAt: Date.now() - 5000,
          currentTokens: {
            accessToken: 'active-access-token',
            refreshToken: currentToken,
          },
        },
      });

      const result = await service.refreshTokens({ refreshToken: prevToken });
      expect(result.accessToken).toBe('active-access-token');
      expect(result.refreshToken).toBe(currentToken);
    });

    it('should reject refreshTokens if user is banned', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1' });
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'some-token',
        profileMetadata: { isBanned: true },
      });

      await expect(
        service.refreshTokens({ refreshToken: 'any-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
