import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { UploadService } from './upload.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageMetricsService } from './usage-metrics.service';
import { FileReferenceService } from './file.service';
import { FileReference, FileReferenceSchema } from './file.schema';
import { DownloadService } from './download.service';
import { ApiKeyModule } from '../api-key/api-key.module';
import { BeeModule } from '../bee/bee.module';
import { OrganizationModule } from '../organization/organization.module';
import { UsageMetrics, UsageMetricsSchema } from './usage-metrics.schema';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    ApiKeyModule,
    BeeModule,
    OrganizationModule,
    PlanModule,
    MongooseModule.forFeature([
      { name: UsageMetrics.name, schema: UsageMetricsSchema },
      { name: FileReference.name, schema: FileReferenceSchema },
    ]),
  ],
  controllers: [DataController],
  providers: [UploadService, FileReferenceService, UsageMetricsService, DownloadService],
  exports: [UsageMetricsService],
})
export class DataModule {}
