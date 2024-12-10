import { Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiKeysRowId, UsersRow } from 'src/DatabaseExtra';
import { UserInContext } from '../user/user.decorator';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('/')
  getApiKeys(@UserInContext() user: UsersRow) {
    return this.apiKeyService.getApiKeys(user.organizationId);
  }

  @Post('/')
  createApiKey(@UserInContext() user: UsersRow) {
    return this.apiKeyService.createApiKey(user.organizationId);
  }

  @Put('/:id/revoke')
  revokeApiKey(@Param('id') id: number) {
    return this.apiKeyService.revokeApiKey(id as ApiKeysRowId);
  }
}
