import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional email. In a real deployment, configure SMTP_* env vars to
 * deliver over SMTP. When no SMTP host is configured (the default for this mock
 * environment), messages are logged to the console instead so the app works with
 * zero setup.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly smtpEnabled: boolean;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    this.smtpEnabled = !!host;
    this.from = this.configService.get<string>('EMAIL_FROM', 'Mock Bank <noreply@mockbank.local>');

    if (this.smtpEnabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT', '587')),
        secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASSWORD'),
        },
      });
    } else {
      // Dev fallback: capture messages as JSON instead of sending them.
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  /** Send a one-time verification code to the given address. */
  async sendOtp(to: string, code: string): Promise<void> {
    const subject = 'Your Mock Bank verification code';
    const text = `Your verification code is ${code}. It expires shortly. If you didn't request this, you can ignore this email.`;

    if (!this.smtpEnabled) {
      // No SMTP configured — log the code so it can be used in development.
      this.logger.warn(
        `[DEV EMAIL] OTP for ${to}: ${code} (set SMTP_HOST to deliver real email)`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
      this.logger.log(`Sent OTP email to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err as Error);
      throw err;
    }
  }
}
