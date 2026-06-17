import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'tsuniforge_refresh_secret_dev'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify the stored refresh token matches
      const isRefreshTokenValid = await bcrypt.compare(dto.refreshToken, user.refreshToken);

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Logout ─────────────────────────────────

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshToken: '' });
    return { message: 'Logged out successfully' };
  }

  // ─── OAuth Login/Register ───────────────────

  async oauthLogin(provider: string, profile: { id: string; email: string; displayName: string; avatar?: string }) {
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthId: profile.id },
    });

    if (!user) {
      // Check if email already exists
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (user) {
        // Link OAuth to existing account
        user.oauthProvider = provider;
        user.oauthId = profile.id;
        if (!user.avatarUrl && profile.avatar) {
          user.avatarUrl = profile.avatar;
        }
        await this.userRepository.save(user);
      } else {
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
    await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
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
