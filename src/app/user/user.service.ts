import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './register.user.dto';
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
      emailVerificationCode: this.generateEmailVerificationCode(),
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

  async resendEmailVerification(user: User) {
    this.verifyEmailVerificationCanBeSent(user);

    const code = this.generateEmailVerificationCode();
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        emailVerificationCode: code,
      },
    );
    const verificationUrl = this.getVerificationUrl(code);
    await this.emailService.sendEmailVerification(user.email, verificationUrl);
  }

  private getVerificationUrl(code: string) {
    return `${this.frontendUrl}/app/verify?c=${code}`;
  }

  private verifyEmailVerificationCanBeSent(user: User) {
    const elapsedSeconds = this.getElapsedSeconds(user.emailVerificationCode);

    if (elapsedSeconds < 60) {
      throw new BadRequestException('Too soon');
    }
  }

  private generateEmailVerificationCode() {
    const random = randomStringGenerator();
    const time = Date.now();
    return `${random}-${time}`;
  }

  async verifyEmail(user: User, code: string) {
    if (user.emailVerified) {
      return;
    }
    if (user.emailVerificationCode !== code) {
      throw new BadRequestException();
    }
    this.checkVerificationCodeExpiration(user.emailVerificationCode);
    await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        emailVerified: true,
      },
    );
  }

  private checkVerificationCodeExpiration(emailVerificationCode: string) {
    const elapsedSeconds = this.getElapsedSeconds(emailVerificationCode);
    if (elapsedSeconds > 24 * 60 * 60) {
      throw new BadRequestException('Expired');
    }
  }

  private getElapsedSeconds(emailVerificationCode: string) {
    const parts = emailVerificationCode.split('-');
    if (parts.length !== 2) {
      throw new BadRequestException();
    }
    const timeOfLastCode = Number(parts[1]);
    if (!timeOfLastCode) {
      throw new BadRequestException();
    }
    return (Date.now() - timeOfLastCode) / 1000;
  }
}
