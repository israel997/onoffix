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
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { EmailService } from '../email/email.service';
import { resolveCountryFromIp } from '../common/geo-ip.util';
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
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAX_ORGANISATIONS_OWNED = 2;

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

const DURATION_UNITS_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse une durée style JWT ("5h", "15m", "7d") — même format que expiresIn. */
function parseDurationMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) return 5 * DURATION_UNITS_MS.h; // repli sûr si mal configuré
  return Number(match[1]) * DURATION_UNITS_MS[match[2]];
}

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
  ) {}

  async register(dto: RegisterDto, ip?: string) {
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

    await this.organizerService.createPersonal(user.id);
    await this.sendOtp(user.id);
    this.captureCountry(user.accountId, ip);

    return { email: user.email };
  }

  /** Résout le pays depuis l'IP et le stocke sur le compte. Best-effort, jamais bloquant. */
  private captureCountry(accountId: string, ip?: string) {
    resolveCountryFromIp(ip)
      .then((pays) => {
        if (!pays) return;
        return this.prisma.account.update({ where: { id: accountId }, data: { pays } });
      })
      .catch((error) => this.logger.warn(`Échec de la géolocalisation IP: ${error}`));
  }

  private async sendOtp(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const code = generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(code), expiresAt },
    });

    await this.emailService.sendOtpEmail(user.email, user.nom, code);
  }

  /** Vérifie le code OTP reçu à l'inscription puis ouvre la session (premier accès réel). */
  async verifyOtp(email: string, code: string, ip?: string) {
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: hashToken(code),
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { email },
      },
      include: { user: true },
    });
    if (!record) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifie: true } }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    this.captureCountry(record.user.accountId, ip);
    return this.issueTokens(
      record.user.id,
      record.user.organisationId,
      record.user.roleGlobal,
      record.user.accountId,
    );
  }

  /**
   * Toujours silencieux côté réponse pour ne pas révéler si un email est enregistré.
   * Un même email peut correspondre à plusieurs organisations (un compte peut en
   * posséder ou en rejoindre plusieurs) — on cible celle qui a vraiment besoin d'un
   * code, sinon ce sont systématiquement les organisations déjà vérifiées les plus
   * anciennes qui répondent, et la nouvelle ne reçoit jamais rien.
   */
  async resendOtp(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, emailVerifie: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) return;

    const lastToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (
      lastToken &&
      Date.now() - lastToken.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new BadRequestException('Merci de patienter avant de redemander un code');
    }

    await this.sendOtp(user.id);
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
      if (!membership.emailVerifie) {
        return { needsVerification: true as const, email: account.email };
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
    if (!membership.emailVerifie) {
      return { needsVerification: true as const, email: account.email };
    }
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
          // On est déjà authentifié avec ce compte — son email a forcément été vérifié
          // pour arriver jusqu'ici, pas besoin de le refaire vérifier pour cette
          // nouvelle organisation (sinon le prochain login dessus resterait bloqué,
          // sans jamais recevoir de code puisqu'une autre org du même compte l'a déjà).
          emailVerifie: true,
          roleGlobal: RoleGlobal.ADMIN,
        },
      });
    });

    await this.organizerService.createPersonal(user.id);
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
      roleGlobal: invitation.roleGlobal,
    };
  }

  async declineInvitation(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash: hashToken(token), acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invitation) {
      throw new BadRequestException('Invitation invalide ou expirée');
    }
    await this.prisma.invitation.delete({ where: { id: invitation.id } });
  }

  async acceptInvitation(dto: AcceptInvitationDto, ip?: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash: hashToken(dto.token), acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invitation) {
      throw new BadRequestException('Invitation invalide ou expirée');
    }

    let account = await this.prisma.account.findUnique({ where: { email: invitation.email } });
    let isNewAccount = false;
    if (!account) {
      isNewAccount = true;
      const passwordHash = await bcrypt.hash(dto.password, 10);
      account = await this.prisma.account.create({
        data: { email: invitation.email, passwordHash },
      });
    }

    const existingMembership = await this.prisma.user.findUnique({
      where: {
        accountId_organisationId: {
          accountId: account.id,
          organisationId: invitation.organisationId,
        },
      },
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
          poste: invitation.poste,
          roleGlobal: invitation.roleGlobal,
          // L'invitation a été envoyée à cette adresse — cliquer le lien la vérifie déjà.
          emailVerifie: true,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await this.organizerService.createPersonal(user.id);
    if (isNewAccount) this.captureCountry(account.id, ip);
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
      await this.prisma.user.findMany({
        where: { accountId: record.accountId },
        select: { id: true },
      })
    ).map((u) => u.id);

    await this.prisma.$transaction([
      this.prisma.account.update({ where: { id: record.accountId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
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

    // Le payload du refresh token peut être périmé (rôle changé, transfert d'organisation
    // depuis l'émission) : on relit l'état actuel plutôt que de le reconduire tel quel,
    // sinon une promotion ADMIN ne prend effet qu'après une déconnexion complète.
    const current = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { roleGlobal: true, organisationId: true },
    });
    if (!current) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return this.issueTokens(
      payload.sub,
      current.organisationId,
      current.roleGlobal,
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

  /** Connexion/inscription via Google : crée un compte + une organisation à la première connexion. */
  async loginWithGoogle(profile: { email: string; nom: string }, ip?: string) {
    const account = await this.prisma.account.findUnique({ where: { email: profile.email } });

    if (!account) {
      const randomPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const ownerId = randomUUID();

      const user = await this.prisma.$transaction(async (tx) => {
        const newAccount = await tx.account.create({
          data: { email: profile.email, passwordHash: randomPasswordHash },
        });
        const organisation = await tx.organisation.create({
          data: { nom: `${profile.nom}'s organisation`, proprietaireId: ownerId },
        });
        return tx.user.create({
          data: {
            id: ownerId,
            accountId: newAccount.id,
            organisationId: organisation.id,
            nom: profile.nom,
            email: profile.email,
            roleGlobal: RoleGlobal.ADMIN,
            emailVerifie: true,
          },
        });
      });

      await this.organizerService.createPersonal(user.id);
      this.captureCountry(user.accountId, ip);
      return this.issueTokens(user.id, user.organisationId, user.roleGlobal, user.accountId);
    }

    const membership = await this.prisma.user.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) {
      throw new UnauthorizedException("Ce compte n'appartient à aucune organisation");
    }

    return this.issueTokens(
      membership.id,
      membership.organisationId,
      membership.roleGlobal,
      account.id,
    );
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

    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '5h');
    const refreshToken = await this.jwtService.signAsync(
      payload as unknown as object,
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      } as JwtSignOptions,
    );

    const tokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    // Doit rester cohérent avec expiresIn ci-dessus — sinon le token JWT expire à un
    // moment et la ligne en base (utilisée pour la révocation) à un autre.
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
