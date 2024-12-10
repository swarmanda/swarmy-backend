import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrganizationsRow } from 'src/DatabaseExtra';
import { Readable } from 'stream';
import { AlertService } from '../alert/alert.service';
import { BeeService } from '../bee/bee.service';
import { FileReferenceService } from './file.service';
import { UploadResultDto } from './upload.result.dto';
import { UsageMetricsService } from './usage-metrics.service';

const BEE_MIN_CHUNK_SIZE = 8192; // chunk + metadata 4K each

@Injectable()
export class UploadService {
  constructor(
    @InjectPinoLogger(UploadService.name)
    private readonly logger: PinoLogger,
    private usageMetricsService: UsageMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
    private alertService: AlertService,
  ) {}

  async uploadFile(
    organization: OrganizationsRow,
    file: Express.Multer.File,
    uploadAsWebsite?: boolean,
  ): Promise<UploadResultDto> {
    if (!organization.postageBatchId) {
      this.logger.info(`Upload attempted org ${organization.id} that doesn't have a postage batch`);
      throw new BadRequestException();
    }
    await this.verifyPostageBatch(organization);
    const stream = Readable.from(file.buffer);
    if (uploadAsWebsite) {
      if (!['application/x-tar', 'application/octet-stream'].includes(file.mimetype)) {
        throw new BadRequestException('Not a .tar file');
      }
    }
    const size = this.roundUp(file.size, BEE_MIN_CHUNK_SIZE);
    const metric = await this.validateUploadLimit(organization, size);
    await this.usageMetricsService.increment(metric, size);
    // todo add decrement on failure
    const result = await this.beeService
      .upload(organization.postageBatchId, stream, file.originalname, uploadAsWebsite)
      .catch((e) => {
        const message = `Failed to upload file "${file.originalname}" of size ${file.size} for organization ${organization.id}`;
        this.alertService.sendAlert(message, e);
        this.logger.error(e, message);
        throw new BadRequestException('Failed to upload file');
      });

    const fileReference = await this.fileReferenceService.getFileReference(organization, result.reference);
    if (fileReference) {
      throw new BadRequestException(`File already uploaded, reference: ${result.reference}`);
    }

    await this.fileReferenceService.createFileReference(result.reference, organization, file, uploadAsWebsite ?? false);
    return { url: result.reference };
  }

  private async verifyPostageBatch(organization: OrganizationsRow) {
    if (!organization.postageBatchId) {
      const message = `Upload attempted org ${organization.id} that doesn't have a postage batch`;
      this.logger.error(message);
      this.alertService.sendAlert(message);
      throw new BadRequestException();
    }
    try {
      await this.beeService.getPostageBatch(organization.postageBatchId);
    } catch (e) {
      const message = `Upload attempted by org: ${organization.id} with postage batch ${organization.postageBatchId} that doesn't exist on bee`;
      this.alertService.sendAlert(message, e);
      this.logger.error(e, message);
      throw new BadRequestException();
    }
  }

  private async validateUploadLimit(organization: OrganizationsRow, size: number) {
    const metric = await this.usageMetricsService.getForOrganization(organization.id, 'UPLOADED_BYTES');

    const remaining = metric.available - metric.used;
    if (remaining < size) {
      throw new UnprocessableEntityException(`Upload limit reached.`);
    }
    return metric;
  }

  roundUp(numToRound: number, multiple: number) {
    if (multiple === 0) return numToRound;

    const remainder = numToRound % multiple;
    if (remainder === 0) return numToRound;

    return numToRound + multiple - remainder;
  }
}
