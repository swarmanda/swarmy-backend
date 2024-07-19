import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadResultDto } from './upload.result.dto';
import { User } from '../user/user.schema';
import { QuotaMetricsService } from './quota-metrics.service';
import { FileReferenceService } from './file.service';
import { BeeService } from '../bee/bee.service';
import { Readable } from 'stream';
import { Organization } from '../organization/organization.schema';

@Injectable()
export class UploadService {
  constructor(
    private quotaMetricsService: QuotaMetricsService,
    private fileReferenceService: FileReferenceService,
    private beeService: BeeService,
  ) {}

  async uploadFile(organization: Organization, file: Express.Multer.File, user?: User): Promise<UploadResultDto> {
    const stream = Readable.from(file.buffer);
    const result = await this.beeService.upload(organization.postageBatchId, stream);

    const fileRef = await this.fileReferenceService.getFileReference(organization, result.reference);
    if (fileRef) {
      throw new BadRequestException(`File already uploaded, reference: ${result.reference}`);
    }

    await this.fileReferenceService.createFileReference(result.reference, organization, file, user);
    await this.quotaMetricsService.handleUploadEvent(organization, file.size);
    return { url: result.reference };
  }
}
