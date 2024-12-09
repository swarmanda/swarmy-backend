import { Injectable } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ApiKeysRow,
  getApiKeysRows,
  getOnlyApiKeysRowOrThrow,
  insertApiKeysRow,
  updateApiKeysRow,
} from 'src/DatabaseExtra';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectPinoLogger(ApiKeyService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createApiKey(organizationId: number): Promise<ApiKeysRow> {
    this.logger.info('creating api key for %s', organizationId);

    const id = await insertApiKeysRow({
      apiKey: randomStringGenerator(),
      organizationId,
      status: 'ACTIVE',
    });
    return getOnlyApiKeysRowOrThrow({ id });
  }

  async getApiKeys(organizationId: number): Promise<ApiKeysRow[]> {
    return getApiKeysRows({ organizationId });
  }

  async getApiKeyBySecret(secret: string): Promise<ApiKeysRow> {
    return getOnlyApiKeysRowOrThrow({ apiKey: secret });
  }

  async revokeApiKey(id: number): Promise<ApiKeysRow> {
    await updateApiKeysRow(id, { status: 'REVOKED' });
    return getOnlyApiKeysRowOrThrow({ id });
  }
}
