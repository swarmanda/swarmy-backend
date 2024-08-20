import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './auth.constants';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UserService } from '../user/user.service';
import { OrganizationService } from '../organization/organization.service';
import { User } from '../user/user.schema';
import { Organization } from '../organization/organization.schema';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private userService: UserService,
    private organizationService: OrganizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // if endpoint has public(), don't run auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const payload = await this.jwtService.verifyAsync(token, {
      secret: jwtConstants.secret,
    });
    const user = await this.getUserOrThrow(payload.email);
    const org = await this.getOrganizationOrThrow(user.organizationId);

    request['user'] = user;
    request['organization'] = org;

    if (!user.emailVerified) {
      if (['/users/resend-email-verification-by-user', '/users/me'].includes(request.path)) {
        return true;
      }
      throw new ForbiddenException();
    }
    return true;
  }

  private async getUserOrThrow(email: string) {
    let user: User;
    try {
      user = await this.userService.getUser(email);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!user || !user.enabled) {
      throw new UnauthorizedException('You shall not pass');
    }
    return user;
  }

  private async getOrganizationOrThrow(orgId: string) {
    let org: Organization;
    try {
      org = await this.organizationService.getOrganization(orgId);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!org || !org.enabled) {
      throw new UnauthorizedException('You shall not pass');
    }
    return org;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
