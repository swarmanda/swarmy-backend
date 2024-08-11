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
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Email.name)
    private emailModel: Model<Email>,
  ) {
    this.sendGridApiKey = configService.get<string>('SENDGRID_API_KEY');
    this.verificationTemplateId = configService.get<string>('EMAIL_VERIFICATION_TEMPLATE_ID');
    this.fromEmail = configService.get<string>('EMAIL_VERIFICATION_FROM_EMAIL');
    this.fromName = configService.get<string>('EMAIL_VERIFICATION_FROM_NAME');
    mail.setApiKey(this.sendGridApiKey);
  }

  async sendEmailVerification(recipient: string, verificationLink: string) {
    // mail.setClient(new Client());
    // mail.setApiKey(this.sendGridApiKey);
    const msg = {
      to: recipient,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: 'Verify your email',
      templateId: this.verificationTemplateId,
      dynamic_template_data: {
        VERIFICATION_LINK: verificationLink,
      },
      // dynamicTemplateData: {
      //   VERIFICATION_LINK: verificationLink,
      // },
    };
    try {
      this.logger.info('Sending verification email');
      await mail.send(msg);
      this.logger.info('Email successfully sent');
    } catch (e) {
      this.logger.error(e, 'Failed to send email');
    }
  }
}
