import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey?: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY');
    this.fromEmail = this.config.get<string>('EMAIL_FROM_ADDRESS', 'onboarding@onoffix.app');
    this.fromName = this.config.get<string>('EMAIL_FROM_NAME', 'OOffix');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    if (!this.apiKey) {
      this.logger.warn(
        'BREVO_API_KEY non configurée — les emails seront seulement loggés, pas envoyés.',
      );
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.log(
        `[dev] Email "${subject}" pour ${to} non envoyé (BREVO_API_KEY non configurée).`,
      );
      return;
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Brevo email send failed (${response.status}): ${body}`);
      throw new Error(`Failed to send email: ${response.status}`);
    }
  }

  async sendVerificationEmail(to: string, nom: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send(to, 'Confirm your OOffix email address', verificationEmailTemplate(nom, link));
  }

  async sendInvitationEmail(to: string, nom: string, organisationNom: string, token: string) {
    const link = `${this.frontendUrl}/accept-invite?token=${token}`;
    await this.send(
      to,
      `You've been invited to join ${organisationNom} on OOffix`,
      invitationEmailTemplate(nom, organisationNom, link),
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

function invitationEmailTemplate(nom: string, organisationNom: string, link: string): string {
  return emailShell(
    nom,
    `You've been invited to join <strong>${escapeHtml(organisationNom)}</strong> on OOffix. Click below to set your password and get started.`,
    link,
    'Accept invitation',
    'This link expires in 7 days.',
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
