import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key/api-key.module';
import { BeeModule } from '../bee/bee.module';
import { OrganizationModule } from '../organization/organization.module';
import { PlanModule } from '../plan/plan.module';
import { DataController } from './data.controller';
import { DownloadService } from './download.service';
import { FileReferenceService } from './file.service';
import { UploadService } from './upload.service';
import { UsageMetricsService } from './usage-metrics.service';

@Module({
  imports: [ApiKeyModule, BeeModule, OrganizationModule, PlanModule],
  controllers: [DataController],
  providers: [UploadService, FileReferenceService, UsageMetricsService, DownloadService],
  exports: [UsageMetricsService],
})
export class DataModule {}
