import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { RoleGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { EmailService } from '../email/email.service';
import { OrganizerScheduler } from '../organizer/organizer.scheduler';
import { OrganizerService } from '../organizer/organizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './jwt-payload.interface';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const REFRESH_TOKEN_SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAX_ORGANISATIONS_OWNED = 2;

function hashToken(token: string): string {
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
    private readonly organizerService: OrganizerService,
    private readonly organizerScheduler: OrganizerScheduler,
  ) {}

  async register(dto: RegisterDto) {
    const existingAccount = await this.prisma.account.findUnique({ where: { email: dto.email } });
    if (existingAccount) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const ownerId = randomUUID();

    const user = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({ data: { email: dto.email, passwordHash } });
      const organisation = await tx.organisation.create({
        data: { nom: dto.organisationNom, proprietaireId: ownerId },
      });
      return tx.user.create({
        data: {
          id: ownerId,
          accountId: account.id,
          organisationId: organisation.id,
          nom: dto.nom,
          email: dto.email,
          roleGlobal: RoleGlobal.ADMIN,
        },
      });
    });

    const personalOrganizer = await this.organizerService.createPersonal(user.id);
    await this.organizerScheduler.schedule(personalOrganizer.id);

    await this.sendVerificationEmail(user.id).catch((error) =>
      this.logger.warn(`Échec d'envoi de l'email de vérification: ${error}`),
    );

    return this.issueTokens(user.id, user.organisationId, user.roleGlobal, user.accountId);
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
    });

    await this.emailService.sendVerificationEmail(user.email, user.nom, rawToken);
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
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
    const account = await this.prisma.account.findUnique({ where: { email: dto.email } });
    if (!account || !(await bcrypt.compare(dto.password, account.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const memberships = await this.prisma.user.findMany({
      where: { accountId: account.id },
      include: { organisation: { select: { id: true, nom: true, logoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException("Ce compte n'appartient à aucune organisation");
    }

    if (dto.organisationId) {
      const membership = memberships.find((m) => m.organisationId === dto.organisationId);
      if (!membership) {
        throw new UnauthorizedException('Vous ne faites pas partie de cette organisation');
      }
      return this.issueTokens(
        membership.id,
        membership.organisationId,
        membership.roleGlobal,
        account.id,
      );
    }

    if (memberships.length > 1) {
      return {
        needsOrganisationSelection: true as const,
        organisations: memberships.map((m) => ({
          id: m.organisation.id,
          nom: m.organisation.nom,
          logoUrl: m.organisation.logoUrl,
        })),
      };
    }

    const [membership] = memberships;
    return this.issueTokens(
      membership.id,
      membership.organisationId,
      membership.roleGlobal,
      account.id,
    );
  }

  /** Bascule vers une autre organisation dont le compte connecté est déjà membre. */
  async switchOrganisation(currentUser: AuthenticatedUser, organisationId: string) {
    const membership = await this.prisma.user.findFirst({
      where: { accountId: currentUser.accountId, organisationId },
    });
    if (!membership) {
      throw new ForbiddenException('Vous ne faites pas partie de cette organisation');
    }
    return this.issueTokens(
      membership.id,
      membership.organisationId,
      membership.roleGlobal,
      currentUser.accountId,
    );
  }

  /** Crée une nouvelle organisation possédée par le compte connecté (limite : MAX_ORGANISATIONS_OWNED). */
  async createOrganisation(currentUser: AuthenticatedUser, dto: CreateOrganisationDto) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: currentUser.accountId },
    });

    const myMembershipIds = (
      await this.prisma.user.findMany({
        where: { accountId: currentUser.accountId },
        select: { id: true },
      })
    ).map((m) => m.id);

    const ownedCount = await this.prisma.organisation.count({
      where: { proprietaireId: { in: myMembershipIds } },
    });
    if (ownedCount >= MAX_ORGANISATIONS_OWNED) {
      throw new BadRequestException(
        `Vous ne pouvez pas posséder plus de ${MAX_ORGANISATIONS_OWNED} organisations`,
      );
    }

    const ownerId = randomUUID();
    const account_ = await this.prisma.user.findFirstOrThrow({
      where: { accountId: currentUser.accountId },
      select: { nom: true },
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: { nom: dto.nom, proprietaireId: ownerId },
      });
      return tx.user.create({
        data: {
          id: ownerId,
          accountId: account.id,
          organisationId: organisation.id,
          nom: account_.nom,
          email: account.email,
          roleGlobal: RoleGlobal.ADMIN,
        },
      });
    });

    const personalOrganizer = await this.organizerService.createPersonal(user.id);
    await this.organizerScheduler.schedule(personalOrganizer.id);

    return this.issueTokens(user.id, user.organisationId, user.roleGlobal, account.id);
  }

  async listMyOrganisations(currentUser: AuthenticatedUser) {
    const memberships = await this.prisma.user.findMany({
      where: { accountId: currentUser.accountId },
      include: { organisation: { select: { id: true, nom: true, logoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organisation.id,
      nom: m.organisation.nom,
      logoUrl: m.organisation.logoUrl,
      roleGlobal: m.roleGlobal,
      current: m.organisationId === currentUser.organisationId,
    }));
  }

  /** Aperçu d'une invitation avant acceptation (email, nom, organisation) — sans authentification. */
  async getInvitationPreview(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash: hashToken(token), acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { organisation: { select: { nom: true } } },
    });
    if (!invitation) {
      throw new BadRequestException('Invitation invalide ou expirée');
    }
    return {
      email: invitation.email,
      nom: invitation.nom,
      organisationNom: invitation.organisation.nom,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash: hashToken(dto.token), acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invitation) {
      throw new BadRequestException('Invitation invalide ou expirée');
    }

    let account = await this.prisma.account.findUnique({ where: { email: invitation.email } });
    if (!account) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      account = await this.prisma.account.create({
        data: { email: invitation.email, passwordHash },
      });
    }

    const existingMembership = await this.prisma.user.findUnique({
      where: { accountId_organisationId: { accountId: account.id, organisationId: invitation.organisationId } },
    });
    if (existingMembership) {
      throw new ConflictException('Vous êtes déjà membre de cette organisation');
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          accountId: account.id,
          organisationId: invitation.organisationId,
          nom: invitation.nom,
          email: invitation.email,
          roleGlobal: invitation.roleGlobal,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const personalOrganizer = await this.organizerService.createPersonal(user.id);
    await this.organizerScheduler.schedule(personalOrganizer.id);

    return this.issueTokens(user.id, user.organisationId, user.roleGlobal, account.id);
  }

  /** Toujours silencieux côté réponse pour ne pas révéler si un email est enregistré. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const account = await this.prisma.account.findUnique({ where: { email: dto.email } });
    if (!account) return;

    const membership = await this.prisma.user.findFirst({ where: { accountId: account.id } });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TTL_HOURS);

    await this.prisma.passwordResetToken.create({
      data: { accountId: account.id, tokenHash: hashToken(rawToken), expiresAt },
    });

    await this.emailService.sendPasswordResetEmail(account.email, membership?.nom ?? '', rawToken);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashToken(dto.token), usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userIds = (
      await this.prisma.user.findMany({ where: { accountId: record.accountId }, select: { id: true } })
    ).map((u) => u.id);

    await this.prisma.$transaction([
      this.prisma.account.update({ where: { id: record.accountId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: { in: userIds }, revoked: false },
        data: { revoked: true },
      }),
    ]);
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

    return this.issueTokens(
      payload.sub,
      payload.organisationId,
      payload.roleGlobal,
      payload.accountId,
    );
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

  private async issueTokens(
    userId: string,
    organisationId: string,
    roleGlobal: RoleGlobal,
    accountId: string,
  ) {
    const payload: JwtPayload = { sub: userId, accountId, organisationId, roleGlobal };

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
