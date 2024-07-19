import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/user.schema';
import { Model } from 'mongoose';
import { QuotaMetrics } from './quota-metrics.schema';
import { FileReference } from './file.schema';
import { Organization } from '../organization/organization.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class QuotaMetricsService {
  constructor(
    @InjectPinoLogger(QuotaMetricsService.name)
    private readonly logger: PinoLogger,
    @InjectModel(QuotaMetrics.name)
    private quotaMetricsModel: Model<QuotaMetrics>,
  ) {}

  async create(user: User): Promise<QuotaMetrics> {
    return await new this.quotaMetricsModel({
      organizationId: user.organizationId,
    }).save();
  }

  async handleUploadEvent(organization: Organization, fileSize: number) {
    const metrics = (await this.quotaMetricsModel.findOne({
      organizationId: organization._id,
    })) as QuotaMetrics;
    this.logger.info('updating quota metrics', metrics.uploadedFilesCount);
    await this.quotaMetricsModel.findOneAndUpdate(
      {
        _id: metrics._id,
      },
      {
        uploadedFilesCount: metrics.uploadedFilesCount + 1,
        uploadedFilesSize: metrics.uploadedFilesSize + fileSize,
      },
    );
  }

  async handleDownloadEvent(fileRef: FileReference) {
    const metrics = (await this.quotaMetricsModel.findOne({
      organizationId: fileRef.organizationId,
    })) as QuotaMetrics;
    await this.quotaMetricsModel.findOneAndUpdate(
      {
        _id: metrics._id,
      },
      {
        downloadedFilesCount: metrics.downloadedFilesCount + 1,
        downloadedFilesSize: metrics.downloadedFilesSize + fileRef.size,
      },
    );
  }

  async getForOrganization(organizationId: string) {
    //todo get active plan
    return (await this.quotaMetricsModel.findOne({
      organizationId,
    })) as QuotaMetrics;
  }
}
