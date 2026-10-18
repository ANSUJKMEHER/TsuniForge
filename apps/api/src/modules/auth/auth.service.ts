import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (isProd) {
      if (!jwtSecret || jwtSecret === 'tsuniforge_jwt_secret_dev' || jwtSecret.length < 32) {
        throw new Error(
          'Fatal security configuration error: JWT_SECRET must be at least 32 characters long in production.',
        );
      }
      if (!refreshSecret || refreshSecret === 'tsuniforge_refresh_secret_dev' || refreshSecret.length < 32) {
        throw new Error(
          'Fatal security configuration error: JWT_REFRESH_SECRET must be at least 32 characters long in production.',
        );
      }
    }
  }

  // ─── Register ───────────────────────────────

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      rating: 1200,
      problemsSolved: 0,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Save refresh token
    await this.updateRefreshToken(savedUser.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  // ─── Login ──────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.profileMetadata?.isBanned || user.profileMetadata?.isActive === false) {
      throw new UnauthorizedException('Account suspended');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Refresh Tokens ─────────────────────────

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'tsuniforge_refresh_secret_dev',
        ),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.profileMetadata?.isBanned || user.profileMetadata?.isActive === false) {
        throw new UnauthorizedException('Account suspended');
      }

      // Check current token
      let isValid = await bcrypt.compare(dto.refreshToken, user.refreshToken);

      // Check 30-second concurrency grace window
      const profileMetadata = user.profileMetadata || {};
      const previousHash = profileMetadata.previousRefreshToken;
      const rotatedAt = profileMetadata.tokenRotatedAt;
      const isWithinGraceWindow =
        rotatedAt && Date.now() - Number(rotatedAt) < 30000;

      if (!isValid && isWithinGraceWindow && previousHash) {
        const isPreviousValid = await bcrypt.compare(
          dto.refreshToken,
          previousHash,
        );
        if (isPreviousValid) {
          // During the 30s grace window when a duplicate request arrives matching previousRefreshToken,
          // return the current valid session tokens without invalidating the user's active session,
          // ensuring the client can continue refreshing normally.
          if (profileMetadata.currentTokens) {
            return profileMetadata.currentTokens;
          }
          return this.generateTokens(user);
        }
      }

      if (!isValid) {
        // Token reuse or expired token outside grace window: Breach detection
        await this.userRepository.update(user.id, {
          refreshToken: '',
          profileMetadata: {
            ...profileMetadata,
            previousRefreshToken: null,
            tokenRotatedAt: null,
            currentTokens: null,
          } as any,
        });
        throw new UnauthorizedException(
          'Invalid refresh token or token reuse detected. Session invalidated.',
        );
      }

      // Valid token: rotate
      const tokens = await this.generateTokens(user);
      const hashedNewToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.userRepository.update(user.id, {
        refreshToken: hashedNewToken,
        profileMetadata: {
          ...profileMetadata,
          previousRefreshToken: user.refreshToken,
          tokenRotatedAt: Date.now(),
          currentTokens: tokens,
        } as any,
      });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Logout ─────────────────────────────────

  async logout(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const profileMetadata = user?.profileMetadata || {};
    await this.userRepository.update(userId, {
      refreshToken: '',
      profileMetadata: {
        ...profileMetadata,
        previousRefreshToken: null,
        tokenRotatedAt: null,
        currentTokens: null,
      } as any,
    });
    return { message: 'Logged out successfully' };
  }

  // ─── OAuth Login/Register ───────────────────

  async oauthLogin(
    provider: string,
    profile: { id: string; email: string; displayName: string; avatar?: string },
  ) {
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthId: profile.id },
    });

    if (!user) {
      // Check if email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Prevent dangling OAuth auto-linking: Require explicit login first
        throw new ConflictException(
          'An account with this email address already exists. Please log in with your credentials to link external authentication providers.',
        );
      }

      // Create new user via OAuth
      const username = await this.generateUniqueUsername(profile.displayName);
      user = this.userRepository.create({
        username,
        email: profile.email,
        oauthProvider: provider,
        oauthId: profile.id,
        avatarUrl: profile.avatar,
        rating: 1200,
        problemsSolved: 0,
      });
      user = await this.userRepository.save(user);
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Get Profile ────────────────────────────

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.sanitizeUser(user);
  }

  // ─── Helper Methods ─────────────────────────

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET', 'tsuniforge_jwt_secret_dev'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'tsuniforge_refresh_secret_dev'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const profileMetadata = user?.profileMetadata || {};
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
      profileMetadata: {
        ...profileMetadata,
        previousRefreshToken: null,
        tokenRotatedAt: null,
        currentTokens: null,
      } as any,
    });
  }

  private sanitizeUser(user: User) {
    const { passwordHash, refreshToken, oauthId, ...sanitized } = user;
    return sanitized;
  }

  private async generateUniqueUsername(displayName: string): Promise<string> {
    const base = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 20);

    let username = base;
    let counter = 0;

    while (await this.userRepository.findOne({ where: { username } })) {
      counter++;
      username = `${base}_${counter}`;
    }

    return username;
  }

  // ─── Leaderboard ────────────────────────────

  async getLeaderboard(limit = 50) {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'avatarUrl', 'rating', 'problemsSolved'],
      order: { rating: 'DESC' },
      take: Math.min(limit, 100),
    });

    return users;
  }
}
