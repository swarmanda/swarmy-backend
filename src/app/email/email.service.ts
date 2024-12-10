import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mail from '@sendgrid/mail';
import { Types } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AlertService } from '../alert/alert.service';

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
    private alertService: AlertService,
  ) {
    this.sendGridApiKey = Types.asString(configService.get<string>('SENDGRID_API_KEY'), { name: 'SENDGRID_API_KEY' });
    this.verificationTemplateId = Types.asString(configService.get<string>('EMAIL_VERIFICATION_TEMPLATE_ID'), {
      name: 'EMAIL_VERIFICATION_TEMPLATE_ID',
    });
    this.emailVerificationFromEmail = Types.asString(configService.get<string>('EMAIL_VERIFICATION_FROM_EMAIL'), {
      name: 'EMAIL_VERIFICATION_FROM_EMAIL',
    });
    this.emailVerificationFromName = Types.asString(configService.get<string>('EMAIL_VERIFICATION_FROM_NAME'), {
      name: 'EMAIL_VERIFICATION_FROM_NAME',
    });
    this.passwordResetTemplateId = Types.asString(configService.get<string>('PASSWORD_RESET_TEMPLATE_ID'), {
      name: 'PASSWORD_RESET_TEMPLATE_ID',
    });
    this.passwordResetFromEmail = Types.asString(configService.get<string>('PASSWORD_RESET_FROM_EMAIL'), {
      name: 'PASSWORD_RESET_FROM_EMAIL',
    });
    this.passwordResetFromName = Types.asString(configService.get<string>('PASSWORD_RESET_FROM_NAME'), {
      name: 'PASSWORD_RESET_FROM_NAME',
    });

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
      const message = 'Failed to send email';
      this.alertService.sendAlert(message, e);
      this.logger.error(e, message);
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
      const message = 'Failed to send email';
      this.alertService.sendAlert(message, e);
      this.logger.error(e, message);
    }
  }
}
