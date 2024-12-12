import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Types } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  getOnlyUsersRowOrNull,
  getOnlyUsersRowOrThrow,
  insertUsersRow,
  updateUsersRow,
  UsersRow,
} from 'src/DatabaseExtra';
import { EmailService } from '../email/email.service';
import { OrganizationService } from '../organization/organization.service';
import { RegisterUserDto } from './register-user.dto';

@Injectable()
export class UserService {
  private readonly frontendUrl: string;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(UserService.name)
    private readonly logger: PinoLogger,
    private organizationService: OrganizationService,
    private emailService: EmailService,
  ) {
    this.frontendUrl = Types.asString(configService.get<string>('FRONTEND_URL'), { name: 'FRONTEND_URL' });
  }

  async createUser(registerUserDto: RegisterUserDto) {
    await this.verifyUniqueEmail(registerUserDto.email);
    const organization = await this.organizationService.create(`${registerUserDto.email}'s organization`);

    const emailVerificationCode = this.generateRandomTokenWithTimestamp();

    await insertUsersRow({
      email: registerUserDto.email,
      password: await this.hash(registerUserDto.password),
      organizationId: organization.id,
      emailVerificationCode,
    });
    this.logger.info('User created: %s', registerUserDto.email);

    const verificationUrl = this.getVerificationUrl(emailVerificationCode);
    await this.emailService.sendEmailVerificationEmail(registerUserDto.email, verificationUrl);
  }

  private async verifyUniqueEmail(email: string) {
    const user = await getOnlyUsersRowOrNull({ email });
    if (user) {
      throw new ConflictException();
    }
  }

  async hash(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }

  async resendEmailVerification(user?: UsersRow | null, code?: string | null) {
    if (!user && !code) {
      throw new BadRequestException();
    }
    if (!user && code) {
      user = await getOnlyUsersRowOrThrow({ emailVerificationCode: code });
    }
    if (!user) {
      throw new BadRequestException();
    }

    this.verifyEmailVerificationCanBeSent(user);

    const newCode = this.generateRandomTokenWithTimestamp();
    await updateUsersRow(user.id, { emailVerificationCode: newCode });
    const verificationUrl = this.getVerificationUrl(newCode);
    await this.emailService.sendEmailVerificationEmail(user.email, verificationUrl);
  }

  private getVerificationUrl(code: string) {
    return `${this.frontendUrl}/verify?c=${code}`;
  }

  private verifyEmailVerificationCanBeSent(user: UsersRow) {
    if (!user) {
      this.logger.debug(`Can't resend email verification code. User does not exist.'`);
      throw new BadRequestException();
    }
    if (user.emailVerified) {
      this.logger.debug(`User already verified. Can't send email verification code.`);
      throw new BadRequestException();
    }
    this.logger.info(user);
    const elapsedSeconds = this.getElapsedSeconds(user.emailVerificationCode);

    if (elapsedSeconds < 20) {
      this.logger.debug(
        `Can't send verification email, last code was sent less than 20 seconds ago. ${user.emailVerificationCode}`,
      );
      throw new BadRequestException();
    }
  }

  private generateRandomTokenWithTimestamp() {
    const random = randomStringGenerator();
    const time = Date.now();
    return `${random}-${time}`;
  }

  async verifyEmail(code: string) {
    const user = await getOnlyUsersRowOrNull({ emailVerificationCode: code });

    if (!user) {
      this.logger.debug(`Can't verify user by code ${code}. User does not exist'`);
      throw new BadRequestException('');
    }
    if (user.emailVerified) {
      return;
    }
    this.checkVerificationCode(user.emailVerificationCode, code);
    this.logger.info(`User email verification successful ${code} ${user.id}'`);
    await updateUsersRow(user.id, { emailVerified: 1 });
  }

  private checkVerificationCode(emailVerificationCode: string, submittedCode: string) {
    if (emailVerificationCode !== submittedCode) {
      this.logger.debug(`Verification codes does not match '${emailVerificationCode}' !== '${submittedCode}'`);
      throw new BadRequestException();
    }
    const elapsedSeconds = this.getElapsedSeconds(emailVerificationCode);
    if (elapsedSeconds > 24 * 60 * 60) {
      this.logger.debug(`Verification code expired ${emailVerificationCode}. Elapsed: ${elapsedSeconds}`);
      throw new BadRequestException('Expired');
    }
  }

  private getElapsedSeconds(tokenWithTimestamp: string) {
    const parts = tokenWithTimestamp.split('-');
    if (parts.length !== 2) {
      throw new BadRequestException();
    }
    const timeOfLastCode = Number(parts[1]);
    if (!timeOfLastCode) {
      throw new BadRequestException();
    }
    return (Date.now() - timeOfLastCode) / 1000;
  }

  async sendResetPasswordEmail(email: string) {
    const user = await getOnlyUsersRowOrNull({ email });
    if (!user) {
      this.logger.info(`Use does not exist with email ${email}, not sending password reset email.`);
      return;
    }
    if (user.resetPasswordToken) {
      if (this.getElapsedSeconds(user.resetPasswordToken) < 60) {
        this.logger.debug(`Reset password token ${this.getElapsedSeconds(user.resetPasswordToken)}`);
        throw new BadRequestException();
      }
    }

    const token = this.generateRandomTokenWithTimestamp();
    await updateUsersRow(user.id, { resetPasswordToken: token });

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(email, resetUrl);
  }

  async resetPassword(password: string, token: string) {
    if (this.getElapsedSeconds(token) > 60 * 60) {
      throw new BadRequestException();
    }
    const user = await getOnlyUsersRowOrNull({ resetPasswordToken: token });

    if (!user) {
      this.logger.info(`Can't reset password by token ${token}. User does not exist.`);
      return;
    }

    this.logger.info(`Resetting password for user ${user.id}`);
    await updateUsersRow(user.id, { resetPasswordToken: null, password: await this.hash(password) });
  }
}
