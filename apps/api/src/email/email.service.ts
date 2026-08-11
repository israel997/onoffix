import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve4 } from 'dns/promises';
import nodemailer, { type Transporter, type TransportOptions } from 'nodemailer';

const GMAIL_SMTP_HOST = 'smtp.gmail.com';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly user?: string;
  private readonly pass?: string;
  private readonly from: string;
  private readonly frontendUrl: string;
  private transporterPromise: Promise<Transporter> | null = null;

  constructor(private readonly config: ConfigService) {
    this.user = this.config.get<string>('GMAIL_USER');
    this.pass = this.config.get<string>('GMAIL_APP_PASSWORD');
    this.from = this.config.get<string>('EMAIL_FROM', this.user ?? 'OnOffix');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    if (!this.user || !this.pass) {
      this.logger.warn(
        'GMAIL_USER/GMAIL_APP_PASSWORD non configurés — les emails seront seulement loggés, pas envoyés.',
      );
    }
  }

  // Nodemailer resolves both A and AAAA records for smtp.gmail.com and picks one
  // at random; Railway has no outbound IPv6 route, so a random AAAA hit fails
  // with ENETUNREACH. Resolving the IPv4 address ourselves avoids that entirely.
  private async getTransporter(): Promise<Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = resolve4(GMAIL_SMTP_HOST).then(([ip]) =>
        nodemailer.createTransport({
          host: ip,
          port: 465,
          secure: true,
          auth: { user: this.user, pass: this.pass },
          tls: { servername: GMAIL_SMTP_HOST },
        } as TransportOptions),
      );
    }
    return this.transporterPromise;
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.user || !this.pass) {
      this.logger.log(`[dev] Email "${subject}" pour ${to} non envoyé (SMTP non configuré).`);
      return;
    }
    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.transporterPromise = null;
      throw err;
    }
  }

  async sendVerificationEmail(to: string, nom: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send(to, 'Confirm your OnOffix email address', verificationEmailTemplate(nom, link));
  }

  async sendInvitationEmail(to: string, nom: string, organisationNom: string, token: string) {
    const link = `${this.frontendUrl}/accept-invite?token=${token}`;
    await this.send(
      to,
      `You've been invited to join ${organisationNom} on OnOffix`,
      invitationEmailTemplate(nom, organisationNom, link),
    );
  }

  async sendPasswordResetEmail(to: string, nom: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send(to, 'Reset your OnOffix password', passwordResetEmailTemplate(nom, link));
  }
}

function verificationEmailTemplate(nom: string, link: string): string {
  return emailShell(
    nom,
    `Please confirm your email address to finish setting up your OnOffix account.`,
    link,
    'Confirm my email',
    'This link expires in 24 hours.',
  );
}

function invitationEmailTemplate(nom: string, organisationNom: string, link: string): string {
  return emailShell(
    nom,
    `You've been invited to join <strong>${escapeHtml(organisationNom)}</strong> on OnOffix. Click below to set your password and get started.`,
    link,
    'Accept invitation',
    'This link expires in 7 days.',
  );
}

function passwordResetEmailTemplate(nom: string, link: string): string {
  return emailShell(
    nom,
    `We received a request to reset your OnOffix password. Click below to choose a new one. If you didn't ask for this, you can ignore this email.`,
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
