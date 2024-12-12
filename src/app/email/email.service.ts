import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'cafe-utility';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AlertService } from '../alert/alert.service';
import { makeEmailTemplate } from './email.template';

@Injectable()
export class EmailService {
  private readonly mailgunApiKey: string;
  private readonly mailgunDomain: string;
  private readonly mailgunSender: string;
  private readonly mailgunUrl: string;
  private client: IMailgunClient;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
    private alertService: AlertService,
  ) {
    this.mailgunApiKey = Types.asString(configService.get<string>('MAILGUN_API_KEY'), { name: 'MAILGUN_API_KEY' });
    this.mailgunDomain = Types.asString(configService.get<string>('MAILGUN_DOMAIN'), { name: 'MAILGUN_DOMAIN' });
    this.mailgunSender = Types.asString(configService.get<string>('MAILGUN_SENDER'), { name: 'MAILGUN_SENDER' });
    this.mailgunUrl = Types.asString(configService.get<string>('MAILGUN_URL'), { name: 'MAILGUN_URL' });
    const mailgun = new Mailgun(formData);
    this.client = mailgun.client({ username: 'api', key: this.mailgunApiKey, url: this.mailgunUrl });
  }

  public async sendEmailVerificationEmail(to: string, verificationUrl: string) {
    return this.sendEmail(
      to,
      'Email verification',
      `Verify your email address by clicking on the link below: ${verificationUrl}`,
      makeEmailTemplate(
        'Thanks for signing up!',
        'Please verify your email address to get access to the service by clicking on the button below.',
        'Verify Email Now',
        verificationUrl,
      ),
    );
  }

  public async sendPasswordResetEmail(to: string, resetUrl: string) {
    return this.sendEmail(
      to,
      'Password reset',
      `Reset your password by clicking on the link below within the next 60 minutes: ${resetUrl}`,
      makeEmailTemplate(
        'Reset your password',
        'Click on the button below  within the next 60 minutes to reset your password for your Swarmy account.',
        'Reset Password',
        resetUrl,
      ),
    );
  }

  private async sendEmail(to: string, subject: string, text: string, html?: string) {
    await this.client.messages
      .create(this.mailgunDomain, {
        from: this.mailgunSender,
        to: [to],
        subject,
        text,
        html,
      })
      .catch((error) => {
        const message = `Failed to send email to ${to} with subject ${subject}`;
        this.alertService.sendAlert(message, error);
        this.logger.error(message, error);
        throw error;
      });
  }
}
