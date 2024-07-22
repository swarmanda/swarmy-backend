import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './register.user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsageMetricsService } from '../data/usage-metrics.service';
import { OrganizationService } from '../organization/organization.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class UserService {
  constructor(
    @InjectPinoLogger(UserService.name)
    private readonly logger: PinoLogger,
    @InjectModel(User.name) private userModel: Model<User>,
    // private usageMetricsService: UsageMetricsService,
    private organizationService: OrganizationService,
  ) {}

  async getUser(email: string): Promise<User> {
    return this.userModel.findOne({ email });
  }

  async createUser(registerUserDto: RegisterUserDto) {
    await this.verifyUniqueUsername(registerUserDto.email);
    const organization = await this.organizationService.create(`${registerUserDto.email}'s organization`);

    const savedUser = await new this.userModel({
      email: registerUserDto.email,
      password: await this.hash(registerUserDto.password),
      organizationId: organization._id,
    }).save();

    this.logger.info('User created: %s', savedUser.email);
    // await this.usageMetricsService.create(savedUser);
  }

  private async verifyUniqueUsername(email: string) {
    const user = await this.getUser(email);
    if (user) {
      throw new ConflictException();
    }
  }

  async hash(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
