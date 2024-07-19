import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { OrganizationService } from '../organization/organization.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private organizationService: OrganizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request) || request.query['k'];
    if (!token) {
      throw new UnauthorizedException();
    }
    let apiKey = null;
    try {
      apiKey = await this.apiKeyService.getApiKeyBySecret(token);
      request['organization'] = await this.organizationService.getOrganization(apiKey.organizationId);
    } catch (e) {
      console.error('Failed to verify API key', e);
      throw new UnauthorizedException('Failed to verify API key');
    }
    if (!apiKey) {
      throw new UnauthorizedException('API key is invalid');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
