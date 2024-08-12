import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Email } from './email.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as mail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly sendGridApiKey: string;
  private readonly verificationTemplateId: string;
  private readonly emailVerificationFromEmail: string;
  private readonly emailVerificationFromName: string;
  private readonly passwordResetTemplateId: string;
  private readonly passwordResetFromEmail: string;
  private readonly passwordResetFromName: string;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Email.name)
    private emailModel: Model<Email>,
  ) {
    this.sendGridApiKey = configService.get<string>('SENDGRID_API_KEY');
    this.verificationTemplateId = configService.get<string>('EMAIL_VERIFICATION_TEMPLATE_ID');
    this.emailVerificationFromEmail = configService.get<string>('EMAIL_VERIFICATION_FROM_EMAIL');
    this.emailVerificationFromName = configService.get<string>('EMAIL_VERIFICATION_FROM_NAME');

    this.passwordResetTemplateId = configService.get<string>('PASSWORD_RESET_TEMPLATE_ID');
    this.passwordResetFromEmail = configService.get<string>('PASSWORD_RESET_FROM_EMAIL');
    this.passwordResetFromName = configService.get<string>('PASSWORD_RESET_FROM_NAME');

    mail.setApiKey(this.sendGridApiKey);
  }

  async sendEmailVerification(recipient: string, verificationLink: string) {
    const msg = {
      to: recipient,
      from: {
        email: this.emailVerificationFromEmail,
        name: this.emailVerificationFromName,
      },
      subject: 'Verify your email',
      templateId: this.verificationTemplateId,
      dynamic_template_data: {
        VERIFICATION_LINK: verificationLink,
      },
    };
    try {
      this.logger.info('Sending verification email');
      await mail.send(msg);
      this.logger.info('Email verification email successfully sent');
    } catch (e) {
      this.logger.error(e, 'Failed to send email');
    }
  }

  async sendPasswordReset(resetUrl: string, recipient: string) {
    const msg = {
      to: recipient,
      from: {
        email: this.passwordResetFromEmail,
        name: this.passwordResetFromName,
      },
      subject: 'Verify your email',
      templateId: this.passwordResetTemplateId,
      dynamic_template_data: {
        RESET_URL: resetUrl,
      },
    };
    try {
      this.logger.info('Sending password reset email');
      await mail.send(msg);
      this.logger.info('Password reset email successfully sent');
    } catch (e) {
      this.logger.error(e, 'Failed to send email');
    }
  }
}
