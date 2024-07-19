import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { UploadService } from './upload.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotaMetrics, QuotaMetricsSchema } from './quota-metrics.schema';
import { QuotaMetricsService } from './quota-metrics.service';
import { FileReferenceService } from './file.service';
import { FileReference, FileReferenceSchema } from './file.schema';
import { DownloadService } from './download.service';
import { ApiKeyModule } from '../api-key/api-key.module';
import { BeeModule } from '../bee/bee.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    ApiKeyModule,
    BeeModule,
    OrganizationModule,
    MongooseModule.forFeature([
      { name: QuotaMetrics.name, schema: QuotaMetricsSchema },
      { name: FileReference.name, schema: FileReferenceSchema },
    ]),
  ],
  controllers: [DataController],
  providers: [UploadService, FileReferenceService, QuotaMetricsService, DownloadService],
  exports: [QuotaMetricsService],
})
export class DataModule {}
