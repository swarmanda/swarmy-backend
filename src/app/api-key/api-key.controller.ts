import { Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { UserInContext } from '../user/user.decorator';
import { User } from '../user/user.schema';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('/')
  getApiKeys(@UserInContext() user: User) {
    return this.apiKeyService.getApiKeys(user.organizationId);
  }

  @Post('/')
  createApiKey(@UserInContext() user: User) {
    return this.apiKeyService.createApiKey(user.organizationId);
  }

  @Put('/:id/revoke')
  revokeApiKey(@Param('id') id: string) {
    return this.apiKeyService.revokeApiKey(id);
  }
}
