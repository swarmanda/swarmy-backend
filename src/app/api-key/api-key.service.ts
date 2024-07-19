import { Injectable } from '@nestjs/common';
import { ApiKey } from './api-key.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectPinoLogger(ApiKeyService.name)
    private readonly logger: PinoLogger,
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKey>,
  ) {}

  async createApiKey(organizationId: string): Promise<ApiKey> {
    this.logger.info('creating api key for %s', organizationId);

    return await new this.apiKeyModel({
      key: randomStringGenerator(),
      organizationId: organizationId,
      status: 'ACTIVE',
    }).save();
  }

  async getApiKeys(organizationId: string): Promise<ApiKey[]> {
    return (await this.apiKeyModel.find({ organizationId })) as ApiKey[];
  }

  async getApiKeyBySecret(secret: string): Promise<ApiKey> {
    return (await this.apiKeyModel.findOne({ key: secret })) as ApiKey;
  }

  async revokeApiKey(id: string): Promise<ApiKey> {
    return this.apiKeyModel.findOneAndUpdate({ _id: id }, { status: 'REVOKED' });
  }
}
