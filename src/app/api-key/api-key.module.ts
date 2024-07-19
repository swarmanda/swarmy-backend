import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKey, ApiKeySchema } from './api-key.schema';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [OrganizationModule, MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }])],
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
