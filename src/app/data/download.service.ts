import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FileReferencesRow, OrganizationsRow } from 'src/DatabaseExtra';
import { AlertService } from '../alert/alert.service';
import { BeeService } from '../bee/bee.service';
import { DownloadResult } from './download-result';
import { FileReferenceService } from './file.service';
import { UsageMetricsService } from './usage-metrics.service';

@Injectable()
export class DownloadService {
  constructor(
    @InjectPinoLogger(DownloadService.name)
    private readonly logger: PinoLogger,
    private usageMetricsService: UsageMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
    private alertService: AlertService,
  ) {}

  async download(organization: OrganizationsRow, hash: string, path?: string): Promise<DownloadResult> {
    await this.verifyPostageBatch(organization);

    const fileRef = await this.fileReferenceService.getFileReference(organization, hash);
    if (!fileRef) {
      throw new NotFoundException();
    }
    const metric = await this.validateDownloadLimit(organization, fileRef);
    this.usageMetricsService.increment(metric, fileRef.size).catch((e) => {
      console.error('Failed to handle download event', e);
    });
    const result = await this.beeService.download(hash, path);

    this.logger.info('CONTENT TYPE:' + result.contentType);
    const headers: Record<string, string> = {};
    if (fileRef.isWebsite && result.contentType) {
      headers['Content-Type'] = result.contentType;
    }
    if (!fileRef.isWebsite) {
      headers['Content-Type'] = fileRef.contentType;
      headers['Content-Disposition'] = `attachment; filename="${fileRef.name}"`;
    }
    return {
      headers,
      data: result.data,
    };
  }

  private async verifyPostageBatch(organization: OrganizationsRow) {
    if (!organization.postageBatchId) {
      this.logger.info(`Upload attempted org ${organization.id} that doesn't have a postage batch`);
      throw new BadRequestException();
    }
    const batch = await this.beeService.getPostageBatch(organization.postageBatchId);
    if (!batch) {
      const message = `Download attempted with postage batch id ${organization.postageBatchId} that doesn't exist on bee`;
      this.alertService.sendAlert(message);
      this.logger.error(message);
      throw new BadRequestException();
    }
  }

  private async validateDownloadLimit(organization: OrganizationsRow, fileReference: FileReferencesRow) {
    const metric = await this.usageMetricsService.getForOrganization(organization.id, 'DOWNLOADED_BYTES');
    const remaining = metric.available - metric.used;
    if (remaining < fileReference.size) {
      throw new UnprocessableEntityException(`Download limit reached.`);
    }
    return metric;
  }
}
