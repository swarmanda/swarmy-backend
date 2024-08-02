import { BadRequestException, Injectable } from '@nestjs/common';
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
    let result;
    if (uploadAsWebsite) {
      if (file.mimetype !== 'application/x-tar') {
        throw new BadRequestException('Not a .tar file');
      }
      result = await this.beeService.upload(organization.postageBatchId, stream, file.originalname, true);
    } else {
      result = await this.beeService.upload(organization.postageBatchId, stream, file.originalname);
    }

    const fileRef = await this.fileReferenceService.getFileReference(organization, result.reference);
    if (fileRef) {
      throw new BadRequestException(`File already uploaded, reference: ${result.reference}`);
    }

    const size = this.roundUp(file.size, BEE_MIN_CHUNK_SIZE);
    await this.fileReferenceService.createFileReference(result.reference, organization, file, user);
    await this.usageMetricsService.increment(organization._id.toString(), 'UPLOADED_BYTES', size, 'LIFETIME');
    return { url: result.reference };
  }

  roundUp(numToRound: number, multiple: number) {
    if (multiple === 0) return numToRound;

    const remainder = numToRound % multiple;
    if (remainder === 0) return numToRound;

    return numToRound + multiple - remainder;
  }
}
