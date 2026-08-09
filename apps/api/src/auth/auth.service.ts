import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { RoleGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';

const REFRESH_TOKEN_SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_TTL_HOURS = 24;

function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: { nom: dto.organisationNom },
      });
      return tx.user.create({
        data: {
          organisationId: organisation.id,
          nom: dto.nom,
          email: dto.email,
          passwordHash,
          roleGlobal: RoleGlobal.ADMIN,
        },
      });
    });

    await this.sendVerificationEmail(user.id).catch((error) =>
      this.logger.warn(`Échec d'envoi de l'email de vérification: ${error}`),
    );

    return this.issueTokens(user.id, user.organisationId, user.roleGlobal);
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashVerificationToken(rawToken), expiresAt },
    });

    await this.emailService.sendVerificationEmail(user.email, user.nom, rawToken);
  }

  async verifyEmail(token: string) {
    const tokenHash = hashVerificationToken(token);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new BadRequestException('Lien de vérification invalide ou expiré');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifie: true } }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.issueTokens(user.id, user.organisationId, user.roleGlobal);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const stored = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false, expiresAt: { gt: new Date() } },
    });

    const match = await this.findMatchingToken(stored, refreshToken);
    if (!match) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revoked: true },
    });

    return this.issueTokens(payload.sub, payload.organisationId, payload.roleGlobal);
  }

  async logout(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return;
    }

    const stored = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false },
    });
    const match = await this.findMatchingToken(stored, refreshToken);
    if (match) {
      await this.prisma.refreshToken.update({
        where: { id: match.id },
        data: { revoked: true },
      });
    }
  }

  private async findMatchingToken(
    candidates: { id: string; tokenHash: string }[],
    refreshToken: string,
  ) {
    for (const candidate of candidates) {
      if (await bcrypt.compare(refreshToken, candidate.tokenHash)) {
        return candidate;
      }
    }
    return null;
  }

  private async issueTokens(userId: string, organisationId: string, roleGlobal: RoleGlobal) {
    const payload: JwtPayload = { sub: userId, organisationId, roleGlobal };

    const accessToken = await this.jwtService.signAsync(
      payload as unknown as object,
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      } as JwtSignOptions,
    );

    const refreshToken = await this.jwtService.signAsync(
      payload as unknown as object,
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      } as JwtSignOptions,
    );

    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
