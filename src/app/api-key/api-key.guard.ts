import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiKeysRow, OrganizationsRow } from 'src/DatabaseExtra';
import { OrganizationService } from '../organization/organization.service';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(ApiKeyGuard.name)
    private readonly logger: PinoLogger,
    private apiKeyService: ApiKeyService,
    private organizationService: OrganizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.query['k'] || this.extractTokenFromHeader(request) || this.extractTokenFromCookies(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    let apiKey: ApiKeysRow | null = null;
    let organization: OrganizationsRow | null = null;
    try {
      apiKey = await this.apiKeyService.getApiKeyBySecret(token);
      if (apiKey && apiKey.status === 'ACTIVE') {
        organization = await this.organizationService.getOrganization(apiKey.organizationId);
      }
    } catch (e) {
      const message = 'Failed to verify API key';
      this.logger.error(e, message);
      throw new UnauthorizedException(message);
    }
    if (!apiKey || apiKey.status !== 'ACTIVE') {
      throw new UnauthorizedException('API key is invalid');
    }
    if (!organization || !organization.enabled) {
      throw new UnauthorizedException('You shall not pass');
    }

    request['organization'] = organization;
    request['key'] = token;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookies(request: Request): string | undefined {
    if (request.cookies && request.cookies['k']) {
      return request.cookies['k'];
    }
  }
}
