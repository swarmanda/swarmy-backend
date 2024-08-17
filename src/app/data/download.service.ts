import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { UsageMetricsService } from './usage-metrics.service';
import { FileReferenceService } from './file.service';
import { BeeService } from '../bee/bee.service';
import { DownloadResult } from './download-result';
import { Organization } from '../organization/organization.schema';
import { FileReference } from './file.schema';

@Injectable()
export class DownloadService {
  constructor(
    private usageMetricsService: UsageMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
  ) {}

  async download(org: Organization, hash: string, path?: string): Promise<DownloadResult> {
    if (!org.postageBatchId) {
      throw new BadRequestException();
    }
    const fileRef = await this.fileReferenceService.getFileReference(org, hash);
    if (!fileRef) {
      throw new NotFoundException();
    }
    const metric = await this.validateDownloadLimit(org, fileRef);
    this.usageMetricsService.increment(metric, fileRef.size).catch((e) => {
      console.error('Failed to handle download event', e);
    });
    const result = await this.beeService.download(hash, path);

    return {
      headers: {
        'Content-Type': fileRef.isWebsite ? result.contentType : fileRef.contentType,
      },
      data: result.data,
    };
  }

  private async validateDownloadLimit(org: Organization, fileRef: FileReference) {
    const metric = await this.usageMetricsService.getForOrganization(org._id.toString(), 'DOWNLOADED_BYTES');
    const remaining = metric.available - metric.used;
    if (remaining < fileRef.size) {
      throw new UnprocessableEntityException(`Download limit reached.`);
    }
    return metric;
  }
}
