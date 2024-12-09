import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrganizationsRow, UsersRow } from 'src/DatabaseExtra';
import { Public } from '../auth/public.decorator';
import { OrganizationInContext } from '../organization/organization.decorator';
import { RegisterUserDto } from './register-user.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { SendPasswordResetDto } from './send-password-reset.dto';
import { UserInContext } from './user.decorator';
import { UserService } from './user.service';
import { VerifyEmailDto } from './verify-email.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  getUser(@UserInContext() user: UsersRow, @OrganizationInContext() organization: OrganizationsRow) {
    return {
      email: user.email,
      organizationId: organization.id,
      postageBatchStatus: organization.postageBatchStatus,
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
  async resendEmailVerificationByUser(@UserInContext() user: UsersRow) {
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
