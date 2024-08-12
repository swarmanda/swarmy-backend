import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './register-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { OrganizationService } from '../organization/organization.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

@Injectable()
export class UserService {
  private readonly frontendUrl: string;

  constructor(
    configService: ConfigService,
    @InjectPinoLogger(UserService.name)
    private readonly logger: PinoLogger,
    @InjectModel(User.name) private userModel: Model<User>,
    // private usageMetricsService: UsageMetricsService,
    private organizationService: OrganizationService,
    private emailService: EmailService,
  ) {
    this.frontendUrl = configService.get<string>('FRONTEND_URL');
  }

  async getUser(email: string): Promise<User> {
    return this.userModel.findOne({ email });
  }

  async createUser(registerUserDto: RegisterUserDto) {
    await this.verifyUniqueEmail(registerUserDto.email);
    const organization = await this.organizationService.create(`${registerUserDto.email}'s organization`);

    const savedUser = await new this.userModel({
      email: registerUserDto.email,
      password: await this.hash(registerUserDto.password),
      organizationId: organization._id,
      emailVerified: false,
      emailVerificationCode: this.generateRandomTokenWithTimestamp(),
    }).save();
    this.logger.info('User created: %s', savedUser.email);

    const verificationUrl = this.getVerificationUrl(savedUser.emailVerificationCode);
    await this.emailService.sendEmailVerification(savedUser.email, verificationUrl);
  }

  private async verifyUniqueEmail(email: string) {
    const user = await this.getUser(email);
    if (user) {
      throw new ConflictException();
    }
  }

  async hash(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }

  async resendEmailVerification(user: User, code: string) {
    if (!user) {
      user = await this.userModel.findOne({ emailVerificationCode: code });
    }

    this.verifyEmailVerificationCanBeSent(user);

    const newCode = this.generateRandomTokenWithTimestamp();
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        emailVerificationCode: newCode,
      },
    );
    const verificationUrl = this.getVerificationUrl(newCode);
    await this.emailService.sendEmailVerification(user.email, verificationUrl);
  }

  private getVerificationUrl(code: string) {
    return `${this.frontendUrl}/verify?c=${code}`;
  }

  private verifyEmailVerificationCanBeSent(user: User) {
    if (!user) {
      this.logger.debug(`Can't resent email verification code. User does not exist.'`);
      throw new BadRequestException();
    }
    if (user.emailVerified) {
      this.logger.debug(`User already verified. Can't send email verification code.`);
      throw new BadRequestException();
    }
    this.logger.info(user);
    const elapsedSeconds = this.getElapsedSeconds(user.resetPasswordToken);

    if (elapsedSeconds < 20) {
      this.logger.debug(
        `Can't send verification email, last code was sent less than 20 seconds ago. ${user.resetPasswordToken}`,
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
    const user = await this.userModel.findOne({ emailVerificationCode: code });

    if (!user) {
      this.logger.debug(`Can't verify user by code ${code}. User does not exist'`);
      throw new BadRequestException('');
    }
    if (user.emailVerified) {
      return;
    }
    this.checkVerificationCode(user.emailVerificationCode, code);
    this.logger.info(`User email verification successful ${code} ${user._id}'`);
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        emailVerified: true,
      },
    );
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
    const user = await this.getUser(email);
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
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        resetPasswordToken: token,
      },
    );

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.emailService.sendPasswordReset(resetUrl, email);
  }

  async resetPassword(password: string, token: string) {
    if (this.getElapsedSeconds(token) > 60 * 60) {
      throw new BadRequestException();
    }
    const user = await this.userModel.findOne({ resetPasswordToken: token });

    if (!user) {
      this.logger.info(`Can't reset password by token ${token}. User does not exist.`);
      return;
    }

    this.logger.info(`Resetting password for user ${user._id}`);
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        password: await this.hash(password),
        resetPasswordToken: null,
      },
    );
  }
}
