import { Injectable, NotFoundException } from '@nestjs/common';
import { UploadResultDto } from './upload.result.dto';
import { QuotaMetricsService } from './quota-metrics.service';
import { FileReferenceService } from './file.service';
import { BeeService } from '../bee/bee.service';
import { DownloadResult } from './download-result';
import { Organization } from '../organization/organization.schema';

@Injectable()
export class DownloadService {
  constructor(
    private quotaMetricsService: QuotaMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
  ) {}

  async download(org: Organization, hash: string): Promise<DownloadResult> {
    const fileRef = await this.fileReferenceService.getFileReference(org, hash);
    if (!fileRef) {
      throw new NotFoundException();
    }
    const result = await this.beeService.download(hash);
    this.quotaMetricsService.handleDownloadEvent(fileRef).catch((e) => {
      console.error('Failed to handle download event', e);
    });

    return {
      contentType: fileRef.contentType,
      data: result.data,
    };
  }
}
