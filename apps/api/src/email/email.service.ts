import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey?: string;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY');
    const fromEmail = this.config.get<string>('EMAIL_FROM_ADDRESS', 'onboarding@resend.dev');
    const fromName = this.config.get<string>('EMAIL_FROM_NAME', 'OOffix');
    this.from = `${fromName} <${fromEmail}>`;
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY non configurée — les emails seront seulement loggés, pas envoyés.',
      );
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.log(
        `[dev] Email "${subject}" pour ${to} non envoyé (RESEND_API_KEY non configurée).`,
      );
      return;
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to: [to], subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend email send failed (${response.status}): ${body}`);
      throw new Error(`Failed to send email: ${response.status}`);
    }
  }

  async sendVerificationEmail(to: string, nom: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send(to, 'Confirm your OOffix email address', verificationEmailTemplate(nom, link));
  }

  async sendInvitationEmail(
    to: string,
    nom: string,
    organisationNom: string,
    inviterNom: string,
    role: 'ADMIN' | 'MEMBRE',
    token: string,
  ) {
    const acceptLink = `${this.frontendUrl}/accept-invite?token=${token}`;
    const declineLink = `${this.frontendUrl}/decline-invite?token=${token}`;
    await this.send(
      to,
      `You've been invited to join ${organisationNom} on OOffix`,
      invitationEmailTemplate(nom, organisationNom, inviterNom, role, acceptLink, declineLink),
    );
  }

  async sendBureauInvitationEmail(
    to: string,
    nom: string,
    bureauNom: string,
    organisationNom: string,
    inviterNom: string,
  ) {
    const link = `${this.frontendUrl}/offices`;
    await this.send(
      to,
      `You've been invited to join ${bureauNom} on OOffix`,
      bureauInvitationEmailTemplate(nom, bureauNom, organisationNom, inviterNom, link),
    );
  }

  async sendPasswordResetEmail(to: string, nom: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send(to, 'Reset your OOffix password', passwordResetEmailTemplate(nom, link));
  }
}

function verificationEmailTemplate(nom: string, link: string): string {
  return emailShell(
    nom,
    `Please confirm your email address to finish setting up your OOffix account.`,
    link,
    'Confirm my email',
    'This link expires in 24 hours.',
  );
}

const ROLE_LABEL: Record<'ADMIN' | 'MEMBRE', string> = { ADMIN: 'Admin', MEMBRE: 'Member' };

function invitationEmailTemplate(
  nom: string,
  organisationNom: string,
  inviterNom: string,
  role: 'ADMIN' | 'MEMBRE',
  acceptLink: string,
  declineLink: string,
): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0a1440; font-size: 20px;">Hi ${escapeHtml(nom)},</h1>
      <p style="color: #333; font-size: 14px; line-height: 1.5;">
        You've been invited by <strong>${escapeHtml(inviterNom)}</strong> to join
        <strong>${escapeHtml(organisationNom)}</strong> as <strong>${ROLE_LABEL[role]}</strong> on OOffix.
        Click below to set your password and get started.
      </p>
      <p style="margin: 24px 0;">
        <a href="${acceptLink}" style="background: #0b63f6; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 12px; display: inline-block;">
          Accept invitation
        </a>
        <a href="${declineLink}" style="background: #dc2626; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Decline invitation
        </a>
      </p>
      <p style="color: #888; font-size: 12px;">This link expires in 7 days.</p>
    </div>
  `;
}

function bureauInvitationEmailTemplate(
  nom: string,
  bureauNom: string,
  organisationNom: string,
  inviterNom: string,
  link: string,
): string {
  return emailShell(
    nom,
    `You've been invited by <strong>${escapeHtml(inviterNom)}</strong> to join the
     <strong>${escapeHtml(bureauNom)}</strong> office in <strong>${escapeHtml(organisationNom)}</strong> on OOffix.
     Log in to accept or decline.`,
    link,
    'Review invitation',
    "You won't be added until you accept.",
  );
}

function passwordResetEmailTemplate(nom: string, link: string): string {
  return emailShell(
    nom,
    `We received a request to reset your OOffix password. Click below to choose a new one. If you didn't ask for this, you can ignore this email.`,
    link,
    'Reset my password',
    'This link expires in 1 hour.',
  );
}

function emailShell(
  nom: string,
  body: string,
  link: string,
  cta: string,
  footnote: string,
): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0a1440; font-size: 20px;">Hi ${escapeHtml(nom)},</h1>
      <p style="color: #333; font-size: 14px; line-height: 1.5;">
        ${body}
      </p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #0b63f6; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          ${cta}
        </a>
      </p>
      <p style="color: #888; font-size: 12px;">
        If the button doesn't work, copy this link into your browser:<br />
        <a href="${link}" style="color: #0b63f6;">${link}</a>
      </p>
      <p style="color: #888; font-size: 12px;">${footnote}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
