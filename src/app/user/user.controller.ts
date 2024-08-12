import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegisterUserDto } from './register-user.dto';
import { UserService } from './user.service';
import { Public } from '../auth/public.decorator';
import { UserInContext } from './user.decorator';
import { User } from './user.schema';
import { OrganizationInContext } from '../organization/organization.decorator';
import { Organization } from '../organization/organization.schema';
import { VerifyEmailDto } from './verify-email.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { SendPasswordResetDto } from './send-password-reset.dto';

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

  @Public()
  @Post('/resend-email-verification-by-code')
  async resendEmailVerificationByCode(@Body() dto: VerifyEmailDto) {
    await this.userService.resendEmailVerification(null, dto.code);
  }

  @Post('/resend-email-verification-by-user')
  async resendEmailVerificationByUser(@UserInContext() user: User) {
    await this.userService.resendEmailVerification(user, null);
  }

  @Public()
  @Post('/verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.userService.verifyEmail(dto.code);
  }

  @Public()
  @Post('/send-reset-password-email')
  async sendResetPasswordEmail(@Body() dto: SendPasswordResetDto) {
    await this.userService.sendResetPasswordEmail(dto.email);
  }

  @Public()
  @Post('/reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.userService.resetPassword(dto.password, dto.token);
  }
}
