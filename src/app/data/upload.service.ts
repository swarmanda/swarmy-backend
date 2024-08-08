import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { UploadResultDto } from './upload.result.dto';
import { User } from '../user/user.schema';
import { UsageMetricsService } from './usage-metrics.service';
import { FileReferenceService } from './file.service';
import { BeeService } from '../bee/bee.service';
import { Readable } from 'stream';
import { Organization } from '../organization/organization.schema';

const BEE_MIN_CHUNK_SIZE = 8000; // chunk + metadata 4K each

@Injectable()
export class UploadService {
  constructor(
    private usageMetricsService: UsageMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
  ) {}

  async uploadFile(
    organization: Organization,
    file: Express.Multer.File,
    uploadAsWebsite?: boolean,
    user?: User,
  ): Promise<UploadResultDto> {
    const stream = Readable.from(file.buffer);
    if (uploadAsWebsite) {
      if (file.mimetype !== 'application/x-tar') {
        throw new BadRequestException('Not a .tar file');
      }
    }
    const size = this.roundUp(file.size, BEE_MIN_CHUNK_SIZE);
    await this.validateUploadLimit(organization, size);
    const result = await this.beeService.upload(
      organization.postageBatchId,
      stream,
      file.originalname,
      uploadAsWebsite,
    );

    const fileRef = await this.fileReferenceService.getFileReference(organization, result.reference);
    if (fileRef) {
      throw new BadRequestException(`File already uploaded, reference: ${result.reference}`);
    }

    await this.fileReferenceService.createFileReference(result.reference, organization, file, uploadAsWebsite, user);
    await this.usageMetricsService.increment(organization._id.toString(), 'UPLOADED_BYTES', size, 'LIFETIME');
    return { url: result.reference };
  }

  private async validateUploadLimit(organization: Organization, size: number) {
    const metrics = await this.usageMetricsService.getForOrganization(organization._id.toString(), 'UPLOADED_BYTES');
    if (!metrics) {
      // first upload in current period.
      return;
    }
    const remaining = metrics.available - metrics.used;
    if (remaining < size) {
      throw new UnprocessableEntityException(`Upload limit reached.`);
    }
  }

  roundUp(numToRound: number, multiple: number) {
    if (multiple === 0) return numToRound;

    const remainder = numToRound % multiple;
    if (remainder === 0) return numToRound;

    return numToRound + multiple - remainder;
  }
}
