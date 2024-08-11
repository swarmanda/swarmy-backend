import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegisterUserDto } from './register.user.dto';
import { UserService } from './user.service';
import { Public } from '../auth/public.decorator';
import { UserInContext } from './user.decorator';
import { User } from './user.schema';
import { OrganizationInContext } from '../organization/organization.decorator';
import { Organization } from '../organization/organization.schema';
import { VerifyEmailDto } from './verify.email.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  getUser(@UserInContext() user: User, @OrganizationInContext() org: Organization) {
    return {
      email: user.email,
      organizationId: org._id,
      postageBatchStatus: org.postageBatchStatus,
      emailVerified: user.emailVerified,
    };
  }

  @Public()
  @Post('/register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    await this.userService.createUser(registerUserDto);
  }

  @Post('/resend-email-verification')
  async resendEmailVerification(@UserInContext() user: User) {
    await this.userService.resendEmailVerification(user);
  }

  @Post('/verify-email')
  async verifyEmail(@UserInContext() user: User, @Body() dto: VerifyEmailDto) {
    await this.userService.verifyEmail(user, dto.code);
  }
}
