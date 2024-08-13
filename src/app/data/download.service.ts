import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsageMetricsService } from './usage-metrics.service';
import { FileReferenceService } from './file.service';
import { BeeService } from '../bee/bee.service';
import { DownloadResult } from './download-result';
import { Organization } from '../organization/organization.schema';

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
    const result = await this.beeService.download(hash, path);

    this.usageMetricsService.increment(org._id.toString(), 'DOWNLOADED_BYTES', fileRef.size).catch((e) => {
      console.error('Failed to handle download event', e);
    });

    return {
      headers: {
        'Content-Type': fileRef.isWebsite ? result.contentType : fileRef.contentType,
      },
      data: result.data,
    };
  }
}
